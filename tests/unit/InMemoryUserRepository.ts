import { randomUUID } from 'crypto';
import { User } from '../../src/entities/User';
import { IUserRepository } from '../../src/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];

  seed(users: User[]): void {
    this.users = users;
  }

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async create(user: Partial<User>): Promise<User> {
    const entity: User = {
      id: randomUUID(),
      name: user.name!,
      email: user.email!,
      password: user.password!,
      role: user.role!,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(entity);
    return entity;
  }

  async save(user: User): Promise<User> {
    const index = this.users.findIndex((u) => u.id === user.id);
    this.users[index] = user;
    return user;
  }

  async delete(user: User): Promise<void> {
    this.users = this.users.filter((u) => u.id !== user.id);
  }
}
