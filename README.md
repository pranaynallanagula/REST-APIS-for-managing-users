# Users API

A small REST API for managing users (create, read, update, delete), with role-based permissions for regular users and admins. It is built with Node.js, TypeScript and Express, uses TypeORM for persistence, and JWT for authentication.

## Project structure

The code is split into three layers so that permission logic is not mixed with HTTP or database details:

- controllers – handle HTTP requests and responses, and call the right service methods.
- services – contain the actual business rules (who is allowed to do what).
- repositories – talk to the database.

The service layer only depends on an `IUserRepository` interface, not on TypeORM directly. This makes it possible to write unit tests for permission logic without touching a real database.

A few design choices:

- The access token is not stored in the database. It is a signed JWT generated at login time with a payload like `{ sub: userId, role }`. Using a live session token column would make expiry and rotation awkward, so a standard JWT is returned in the login response instead.
- You cannot set your own role when signing up, or change it to admin in a normal update. Registration always creates a user with role `USER`, and only an existing admin can promote someone else.
- Passwords are hashed with bcrypt and never included in any API response.
- SQLite is used by default so the project runs with zero setup. To use MySQL instead, set `DB_TYPE=mysql` in `.env` (see `.env.example`). No code changes are needed.

## Permissions

Overview of what different roles can and cannot do:

USER – view own profile: 200

USER – view another user’s profile: 403

USER – update own profile: 200

USER – try to change own role: 422 (rejected)

USER – update another user: 403

USER – list all users: 403

USER – delete any user (including self): 403

ADMIN – list all users: 200

ADMIN – view or update any user, including role: 200

ADMIN – delete another user: 204

ADMIN – delete self: 403

ADMIN – act on a user that does not exist: 404

anyone – missing token or invalid token on a protected route: 401

## Running the API

From the project root:

```bash
npm install
cp .env.example .env    # optional, defaults work out of the box
npm run dev              # starts server at http://localhost:3000
```

## Tests

```bash
npm test
npm run test:coverage
```

There are two test suites:

- **tests/unit** – exercise the permission and business logic against an in-memory fake repository, without HTTP or a real database.
- **tests/integration** – start the real Express app and use Supertest over HTTP, backed by an in-memory SQLite database. These tests cover register, login, CRUD operations, and the permission edge cases (401, 403, 404, 409, 422).

## Endpoints

### `POST /auth/register`

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Returns 201 with the newly created user. The role is always `USER`, regardless of what is sent.

### `POST /auth/login`

Request body:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Returns 200 with the user plus `attributes.access_token`. Use this token as:

```
Authorization: Bearer <token>
```

for the protected routes below.

### User routes

- `GET /users` – admin only
- `GET /users/:id` – allowed for the authenticated user (their own id) or any admin
- `PATCH /users/:id` – allowed for the authenticated user (can change name, email, password) or any admin (can also change role)
- `DELETE /users/:id` – admin only, and admins cannot delete themselves
