import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';

const isTest = process.env.NODE_ENV === 'test';
const useMysql = process.env.DB_TYPE === 'mysql';

export const AppDataSource = new DataSource(
  isTest
    ? {
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        entities: [User],
        synchronize: true,
        logging: false,
      }
    : useMysql
      ? {
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 3306,
          username: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'leovegas_users',
          entities: [User],
          synchronize: true,
          logging: false,
        }
      : {
          type: 'sqlite',
          database: process.env.DB_PATH || 'data/database.sqlite',
          entities: [User],
          synchronize: true,
          logging: false,
        },
);
