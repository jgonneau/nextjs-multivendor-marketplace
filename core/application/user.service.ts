import type { User } from "@/core/domain/entities";
import type { UserRepository } from "@/core/ports/repositories";
import type { PasswordHasher } from "@/core/ports/security";
import type { CreateUserCommand, UpdateUserCommand } from "./commands";
import { NotFoundError, ValidationError } from "@/core/domain/errors";

/** Accounts and roles. Passwords are always stored hashed. */
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  listUsers(): Promise<User[]> {
    return this.users.list();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundError(`User with id "${id}" not found.`);
    }
    return user;
  }

  getUserByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  async createUser(command: CreateUserCommand): Promise<User> {
    if (!command?.email || !command?.password) {
      throw new ValidationError('Fields "email" and "password" are required.');
    }
    if (await this.users.findByEmail(command.email)) {
      throw new ValidationError("A user already exists with this email.");
    }
    return this.users.create({
      email: command.email,
      password: await this.hasher.hash(command.password),
      name: command.name || undefined,
      role: command.role || "USER",
    });
  }

  /** Only email, name, role and password can change; anything else is ignored. */
  async updateUser(id: string, command: UpdateUserCommand): Promise<User> {
    await this.getUserById(id);
    const { email, name, role, password } = command;
    return this.users.update(id, {
      ...(email !== undefined && { email }),
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(password !== undefined && { password: await this.hasher.hash(password) }),
    });
  }

  async deleteUserById(id: string): Promise<User> {
    // Checked first so a missing id is a clear 404, not a data error.
    await this.getUserById(id);
    return this.users.delete(id);
  }
}
