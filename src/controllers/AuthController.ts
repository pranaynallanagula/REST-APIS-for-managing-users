import { NextFunction, Request, Response } from 'express';
import { CreateUserDto } from '../dto/CreateUserDto';
import { LoginDto } from '../dto/LoginDto';
import { UserService } from '../services/UserService';
import { serializeUser } from '../utils/jsonapi';

export class AuthController {
  constructor(private readonly userService: UserService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateUserDto;
      const user = await this.userService.register(dto);
      res.status(201).json(serializeUser(user));
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as LoginDto;
      const { user, accessToken } = await this.userService.login(dto.email, dto.password);
      const document = serializeUser(user);
      (document.data as { attributes: Record<string, unknown> }).attributes.access_token = accessToken;
      res.status(200).json(document);
    } catch (err) {
      next(err);
    }
  };
}
