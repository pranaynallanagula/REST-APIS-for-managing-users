import 'reflect-metadata';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { TypeOrmUserRepository } from './repositories/TypeOrmUserRepository';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { UserService } from './services/UserService';

export function createApp(dataSource: DataSource): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ type: ['application/json', 'application/vnd.api+json'] }));

  const userRepository = new TypeOrmUserRepository(dataSource.getRepository(User));
  const userService = new UserService(userRepository);

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/auth', authRoutes(userService));
  app.use('/users', userRoutes(userService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
