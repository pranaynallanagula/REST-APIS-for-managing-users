import jwt from 'jsonwebtoken';
import { Role } from '../entities/Role';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export class TokenService {
  constructor(
    private readonly secret?: string,
    private readonly expiresIn?: string,
  ) {}

  // Reads env lazily (not at construction time) so module-level singletons still
  // pick up JWT_SECRET even if it's set after the module graph is first loaded.
  private resolveSecret(): string {
    return this.secret ?? process.env.JWT_SECRET ?? 'dev-secret-change-me';
  }

  private resolveExpiresIn(): string {
    return this.expiresIn ?? process.env.JWT_EXPIRES_IN ?? '1h';
  }

  sign(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.resolveSecret(), { expiresIn: this.resolveExpiresIn() } as jwt.SignOptions);
  }

  verify(token: string): AccessTokenPayload {
    return jwt.verify(token, this.resolveSecret()) as AccessTokenPayload;
  }
}
