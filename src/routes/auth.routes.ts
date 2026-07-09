import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { CreateUserDto } from '../dto/CreateUserDto';
import { LoginDto } from '../dto/LoginDto';
import { validateBody } from '../middleware/validate';
import { UserService } from '../services/UserService';

export function authRoutes(userService: UserService): Router {
  const router = Router();
  const controller = new AuthController(userService);

  router.post('/register', validateBody(CreateUserDto), controller.register);
  router.post('/login', validateBody(LoginDto), controller.login);

  return router;
}
