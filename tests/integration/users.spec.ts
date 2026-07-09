import 'reflect-metadata';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createApp } from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { Role } from '../../src/entities/Role';
import { User } from '../../src/entities/User';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

let dataSource: DataSource;
let app: Application;

async function registerAndLogin(email: string, password = 'password123') {
  await request(app).post('/auth/register').send({ name: 'Test User', email, password });
  const res = await request(app).post('/auth/login').send({ email, password });
  const token = res.body.data.attributes.access_token as string;
  const id = res.body.data.id as string;
  return { token, id };
}

async function promoteToAdmin(id: string) {
  const repo = dataSource.getRepository(User);
  await repo.update({ id }, { role: Role.ADMIN });
}

/** Promotes the given user then returns a fresh token carrying the ADMIN role claim. */
async function makeAdmin(email: string, password = 'password123') {
  const { id } = await registerAndLogin(email, password);
  await promoteToAdmin(id);
  const res = await request(app).post('/auth/login').send({ email, password });
  const token = res.body.data.attributes.access_token as string;
  return { token, id };
}

beforeAll(async () => {
  dataSource = await AppDataSource.initialize();
  app = createApp(dataSource);
});

afterAll(async () => {
  await dataSource.destroy();
});

afterEach(async () => {
  await dataSource.getRepository(User).clear();
});

describe('POST /auth/register', () => {
  it('creates a user and returns a JSON:API document without the password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('users');
    expect(res.body.data.attributes.email).toBe('alice@example.com');
    expect(res.body.data.attributes.role).toBe('USER');
    expect(res.body.data.attributes.password).toBeUndefined();
  });

  it('returns 422 for an invalid payload', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'A', email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'dup@example.com', password: 'password123' });
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice2', email: 'dup@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns an access token for valid credentials', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
    const res = await request(app).post('/auth/login').send({ email: 'bob@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.attributes.access_token).toEqual(expect.any(String));
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('GET /users/:id', () => {
  it('allows a user to view their own details', async () => {
    const { token, id } = await registerAndLogin('self@example.com');
    const res = await request(app).get(`/users/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 403 when a user views another user', async () => {
    const { token } = await registerAndLogin('viewer@example.com');
    const { id: otherId } = await registerAndLogin('victim@example.com');
    const res = await request(app).get(`/users/${otherId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/users/some-id');
    expect(res.status).toBe(401);
  });

  it('allows an admin to view any user and returns 404 for missing ones', async () => {
    const { token: adminToken } = await makeAdmin('admin1@example.com');
    const { id: otherId } = await registerAndLogin('other1@example.com');

    const ok = await request(app).get(`/users/${otherId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);

    const missing = await request(app)
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });
});

describe('GET /users', () => {
  it('forbids a regular user from listing all users', async () => {
    const { token } = await registerAndLogin('lister@example.com');
    const res = await request(app).get('/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows an admin to list all users', async () => {
    const { token } = await makeAdmin('admin2@example.com');
    const res = await request(app).get('/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PATCH /users/:id', () => {
  it('allows a user to update their own details', async () => {
    const { token, id } = await registerAndLogin('updater@example.com');
    const res = await request(app)
      .patch(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.attributes.name).toBe('Updated Name');
  });

  it('forbids a user from updating their own role', async () => {
    const { token, id } = await registerAndLogin('roleattempt@example.com');
    const res = await request(app)
      .patch(`/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(422);
  });

  it('forbids a user from updating another user', async () => {
    const { token } = await registerAndLogin('attacker@example.com');
    const { id: otherId } = await registerAndLogin('target@example.com');
    const res = await request(app)
      .patch(`/users/${otherId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('allows an admin to update role and details of another user', async () => {
    const { token: adminToken } = await makeAdmin('admin3@example.com');
    const { id: otherId } = await registerAndLogin('promotee@example.com');

    const res = await request(app)
      .patch(`/users/${otherId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN', name: 'Promoted User' });

    expect(res.status).toBe(200);
    expect(res.body.data.attributes.role).toBe('ADMIN');
    expect(res.body.data.attributes.name).toBe('Promoted User');
  });

  it('returns 404 when an admin updates a non-existent user', async () => {
    const { token: adminToken } = await makeAdmin('admin4@example.com');
    const res = await request(app)
      .patch('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /users/:id', () => {
  it('forbids a user from deleting themselves', async () => {
    const { token, id } = await registerAndLogin('selfdelete@example.com');
    const res = await request(app).delete(`/users/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('forbids a regular user from deleting another user', async () => {
    const { token } = await registerAndLogin('deleter@example.com');
    const { id: otherId } = await registerAndLogin('deletetarget@example.com');
    const res = await request(app).delete(`/users/${otherId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('forbids an admin from deleting themselves', async () => {
    const { token: adminToken, id: adminId } = await makeAdmin('admin5@example.com');
    const res = await request(app).delete(`/users/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('allows an admin to delete another user', async () => {
    const { token: adminToken } = await makeAdmin('admin6@example.com');
    const { id: otherId } = await registerAndLogin('deleteme@example.com');

    const res = await request(app).delete(`/users/${otherId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when an admin deletes a non-existent user', async () => {
    const { token: adminToken } = await makeAdmin('admin7@example.com');
    const res = await request(app)
      .delete('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
