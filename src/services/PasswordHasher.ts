import bcrypt from 'bcryptjs';

/** Thin wrapper around bcrypt so consumers depend on an interface-shaped module, not a specific library. */
export class PasswordHasher {
  private static readonly SALT_ROUNDS = 10;

  static hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, PasswordHasher.SALT_ROUNDS);
  }

  static compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
