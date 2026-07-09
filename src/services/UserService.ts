import { Role } from '../entities/Role';
import { User } from '../entities/User';
import { AdminUpdateUserDto } from '../dto/AdminUpdateUserDto';
import { CreateUserDto } from '../dto/CreateUserDto';
import { UpdateUserDto } from '../dto/UpdateUserDto';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/ApiError';
import { IUserRepository } from '../repositories/IUserRepository';
import { PasswordHasher } from './PasswordHasher';
import { AccessTokenPayload, TokenService } from './TokenService';

export interface AuthenticatedActor {
  id: string;
  role: Role;
}

/**
 * Holds every authorization + business rule for the User resource so controllers
 * stay thin HTTP adapters (SRP) and rules are independently testable.
 */
export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService = new TokenService(),
  ) {}

  async register(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmailWithPassword(dto.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const hashed = await PasswordHasher.hash(dto.password);
    // Role is never taken from client input on self-registration; it always defaults to USER.
    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: Role.USER,
    });
  }

  async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const matches = await PasswordHasher.compare(password, user.password);
    if (!matches) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = this.tokenService.sign(payload);
    return { user, accessToken };
  }

  /** ADMIN can list all users; a USER has no listing privileges. */
  async list(actor: AuthenticatedActor): Promise<User[]> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only administrators can list users.');
    }
    return this.userRepository.findAll();
  }

  /** USER may view only their own record; ADMIN may view any record. */
  async getById(actor: AuthenticatedActor, targetId: string): Promise<User> {
    if (actor.role !== Role.ADMIN && actor.id !== targetId) {
      throw new ForbiddenError('You may only view your own details.');
    }

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * USER may update only their own record and may not change their own role.
   * ADMIN may update any record, including role, via a richer DTO.
   */
  async update(
    actor: AuthenticatedActor,
    targetId: string,
    dto: UpdateUserDto | AdminUpdateUserDto,
  ): Promise<User> {
    const isSelf = actor.id === targetId;
    const isAdmin = actor.role === Role.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('You may only update your own details.');
    }

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      // Admins acting on a non-existent user get 404; a self-updating user acting on
      // their own id will always exist since that id came from a valid token.
      throw new NotFoundError('User');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.password !== undefined) user.password = await PasswordHasher.hash(dto.password);

    const roleChange = (dto as AdminUpdateUserDto).role;
    if (roleChange !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can change a user role.');
      }
      user.role = roleChange;
    }

    return this.userRepository.save(user);
  }

  /** ADMIN can delete any user except themselves; no role may delete itself. */
  async delete(actor: AuthenticatedActor, targetId: string): Promise<void> {
    if (actor.id === targetId) {
      throw new ForbiddenError('You cannot delete your own account.');
    }

    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only administrators can delete users.');
    }

    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new NotFoundError('User');
    }

    await this.userRepository.delete(user);
  }
}
