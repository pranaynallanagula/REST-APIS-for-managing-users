import { User } from '../entities/User';

export interface JsonApiResourceObject {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}

export interface JsonApiDocument {
  data: JsonApiResourceObject | JsonApiResourceObject[];
  meta?: Record<string, unknown>;
}

/** Maps a User entity onto the public attributes we are willing to expose (never the password hash). */
function toAttributes(user: User): Record<string, unknown> {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function serializeUser(user: User): JsonApiDocument {
  return {
    data: {
      type: 'users',
      id: user.id,
      attributes: toAttributes(user),
    },
  };
}

export function serializeUsers(users: User[], meta?: Record<string, unknown>): JsonApiDocument {
  return {
    data: users.map((user) => ({
      type: 'users',
      id: user.id,
      attributes: toAttributes(user),
    })),
    ...(meta ? { meta } : {}),
  };
}
