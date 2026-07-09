import { NextFunction, Response } from 'express';
import { AdminUpdateUserDto } from '../dto/AdminUpdateUserDto';
import { UpdateUserDto } from '../dto/UpdateUserDto';
import { Role } from '../entities/Role';
import { UnauthorizedError } from '../errors/ApiError';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { UserService } from '../services/UserService';
import { serializeUser, serializeUsers } from '../utils/jsonapi';

function requireActor(req: AuthenticatedRequest) {
  if (!req.actor) {
    throw new UnauthorizedError();
  }
  return req.actor;
}

export class UserController {
  constructor(private readonly userService: UserService) {}

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = requireActor(req);
      const users = await this.userService.list(actor);
      res.status(200).json(serializeUsers(users));
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = requireActor(req);
      const user = await this.userService.getById(actor, req.params.id);
      res.status(200).json(serializeUser(user));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = requireActor(req);
      const dto = actor.role === Role.ADMIN ? (req.body as AdminUpdateUserDto) : (req.body as UpdateUserDto);
      const user = await this.userService.update(actor, req.params.id, dto);
      res.status(200).json(serializeUser(user));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = requireActor(req);
      await this.userService.delete(actor, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
