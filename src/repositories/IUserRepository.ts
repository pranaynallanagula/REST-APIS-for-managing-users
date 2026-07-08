import { User } from '../entities/User';

/** Abstraction the service layer depends on, so it never couples to TypeORM directly (DIP). */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  create(user: Partial<User>): Promise<User>;
  save(user: User): Promise<User>;
  delete(user: User): Promise<void>;
}
