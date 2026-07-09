import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authenticate';
import { validateUserUpdate } from '../middleware/validateUserUpdate';
import { UserService } from '../services/UserService';

export function userRoutes(userService: UserService): Router {
  const router = Router();
  const controller = new UserController(userService);

  router.use(authenticate);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', validateUserUpdate, controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
