import type { User } from "@/core/domain/entities";
import type { UserRepository } from "@/core/ports/repositories";
import type { PasswordHasher, TokenIssuer } from "@/core/ports/security";
import type { LoginCommand } from "./commands";
import { PermissionError } from "@/core/domain/errors";

export type LoginResult = { user: User; token: string };

/** Signing in: check credentials, issue a token, remember it on the account. */
export class AuthService {
  // Verified against when the email is unknown, so a login for a missing user
  // takes as long as one with a wrong password (no account enumeration by timing).
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer
  ) {}

  /** Throws PermissionError for an unknown email, a wrong password or a deactivated account. */
  async authenticate(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    const stored = user?.password ?? (await (this.dummyHash ??= this.hasher.hash("not-a-real-password")));
    const passwordOk = await this.hasher.verify(password, stored);
    if (!user || !passwordOk || user.activated === false) {
      throw new PermissionError("Invalid credentials.");
    }
    return user;
  }

  async login({ email, password }: LoginCommand): Promise<LoginResult> {
    const user = await this.authenticate(email, password);
    const token = await this.tokens.issue({ id: user.id, email: user.email, role: user.role });
    await this.users.update(user.id, { token });
    return { user, token };
  }
}
