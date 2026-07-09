import 'reflect-metadata';
import { Role } from '../../src/entities/Role';
import { User } from '../../src/entities/User';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../src/errors/ApiError';
import { PasswordHasher } from '../../src/services/PasswordHasher';
import { UserService } from '../../src/services/UserService';
import { InMemoryUserRepository } from './InMemoryUserRepository';

async function makeUser(repo: InMemoryUserRepository, overrides: Partial<User> = {}): Promise<User> {
  return repo.create({
    name: overrides.name ?? 'Jane Doe',
    email: overrides.email ?? `jane-${Math.random()}@example.com`,
    password: overrides.password ?? (await PasswordHasher.hash('password123')),
    role: overrides.role ?? Role.USER,
  });
}

describe('UserService', () => {
  let repo: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    service = new UserService(repo);
  });

  describe('register', () => {
    it('creates a new user with USER role regardless of requested role', async () => {
      const user = await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: Role.ADMIN,
      });

      expect(user.role).toBe(Role.USER);
      expect(user.email).toBe('john@example.com');
    });

    it('rejects duplicate emails with a conflict error', async () => {
      await makeUser(repo, { email: 'dup@example.com' });

      await expect(
        service.register({ name: 'Dup', email: 'dup@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('login', () => {
    it('issues an access token for valid credentials', async () => {
      await service.register({ name: 'John', email: 'john@example.com', password: 'password123' });
      const { accessToken, user } = await service.login('john@example.com', 'password123');

      expect(accessToken).toEqual(expect.any(String));
      expect(user.email).toBe('john@example.com');
    });

    it('rejects an unknown email', async () => {
      await expect(service.login('missing@example.com', 'password123')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it('rejects an incorrect password', async () => {
      await service.register({ name: 'John', email: 'john@example.com', password: 'password123' });
      await expect(service.login('john@example.com', 'wrong-password')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });

  describe('list', () => {
    it('allows ADMIN to list users', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      await makeUser(repo);

      const result = await service.list({ id: admin.id, role: Role.ADMIN });
      expect(result).toHaveLength(2);
    });

    it('forbids USER from listing users', async () => {
      const user = await makeUser(repo);
      await expect(service.list({ id: user.id, role: Role.USER })).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('getById', () => {
    it('allows a USER to view their own details', async () => {
      const user = await makeUser(repo);
      const result = await service.getById({ id: user.id, role: Role.USER }, user.id);
      expect(result.id).toBe(user.id);
    });

    it('forbids a USER from viewing another user', async () => {
      const user = await makeUser(repo);
      const other = await makeUser(repo);
      await expect(service.getById({ id: user.id, role: Role.USER }, other.id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('allows ADMIN to view any user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      const other = await makeUser(repo);
      const result = await service.getById({ id: admin.id, role: Role.ADMIN }, other.id);
      expect(result.id).toBe(other.id);
    });

    it('returns NotFoundError when ADMIN requests a non-existent user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      await expect(
        service.getById({ id: admin.id, role: Role.ADMIN }, 'does-not-exist'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('update', () => {
    it('allows a USER to update their own details', async () => {
      const user = await makeUser(repo);
      const updated = await service.update({ id: user.id, role: Role.USER }, user.id, {
        name: 'New Name',
      });
      expect(updated.name).toBe('New Name');
    });

    it('forbids a USER from updating another user', async () => {
      const user = await makeUser(repo);
      const other = await makeUser(repo);
      await expect(
        service.update({ id: user.id, role: Role.USER }, other.id, { name: 'Hack' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('forbids a USER from changing their own role', async () => {
      const user = await makeUser(repo);
      await expect(
        service.update({ id: user.id, role: Role.USER }, user.id, { role: Role.ADMIN } as never),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('allows ADMIN to update role and details of another user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      const other = await makeUser(repo);
      const updated = await service.update({ id: admin.id, role: Role.ADMIN }, other.id, {
        role: Role.ADMIN,
        name: 'Promoted',
      });
      expect(updated.role).toBe(Role.ADMIN);
      expect(updated.name).toBe('Promoted');
    });

    it('returns NotFoundError when ADMIN updates a non-existent user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      await expect(
        service.update({ id: admin.id, role: Role.ADMIN }, 'does-not-exist', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('allows ADMIN to delete another user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      const other = await makeUser(repo);
      await service.delete({ id: admin.id, role: Role.ADMIN }, other.id);
      expect(await repo.findById(other.id)).toBeNull();
    });

    it('forbids USER from deleting another user', async () => {
      const user = await makeUser(repo);
      const other = await makeUser(repo);
      await expect(service.delete({ id: user.id, role: Role.USER }, other.id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('forbids ADMIN from deleting themselves', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      await expect(service.delete({ id: admin.id, role: Role.ADMIN }, admin.id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('forbids USER from deleting themselves', async () => {
      const user = await makeUser(repo);
      await expect(service.delete({ id: user.id, role: Role.USER }, user.id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('returns NotFoundError when ADMIN deletes a non-existent user', async () => {
      const admin = await makeUser(repo, { role: Role.ADMIN });
      await expect(
        service.delete({ id: admin.id, role: Role.ADMIN }, 'does-not-exist'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
