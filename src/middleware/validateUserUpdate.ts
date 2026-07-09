import { NextFunction, Response } from 'express';
import { AdminUpdateUserDto } from '../dto/AdminUpdateUserDto';
import { UpdateUserDto } from '../dto/UpdateUserDto';
import { Role } from '../entities/Role';
import { AuthenticatedRequest } from './authenticate';
import { validateBody } from './validate';

const validateAsUser = validateBody(UpdateUserDto);
const validateAsAdmin = validateBody(AdminUpdateUserDto);

/** Picks the update DTO based on the authenticated actor's role: only ADMIN may submit `role`. */
export function validateUserUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const validator = req.actor?.role === Role.ADMIN ? validateAsAdmin : validateAsUser;
  validator(req, res, next);
}
