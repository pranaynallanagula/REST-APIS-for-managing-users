import { NextFunction, Request, Response } from 'express';
import { Role } from '../entities/Role';
import { UnauthorizedError } from '../errors/ApiError';
import { TokenService } from '../services/TokenService';

export interface AuthenticatedRequest extends Request {
  actor?: { id: string; role: Role };
}

const tokenService = new TokenService();

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing bearer access token.'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = tokenService.verify(token);
    req.actor = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token.'));
  }
}
