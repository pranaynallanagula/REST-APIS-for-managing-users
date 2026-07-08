import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { IUserRepository } from './IUserRepository';

export class TypeOrmUserRepository implements IUserRepository {
  constructor(private readonly repo: Repository<User>) {}

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  create(user: Partial<User>): Promise<User> {
    const entity = this.repo.create(user);
    return this.repo.save(entity);
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async delete(user: User): Promise<void> {
    await this.repo.remove(user);
  }
}
