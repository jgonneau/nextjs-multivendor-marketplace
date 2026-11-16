/**
 * Driven ports for security concerns. The core decides *when* to hash a
 * password or issue a token; adapters/security/ decides *how* (scrypt, jose).
 */
import type { Role } from "@/core/domain/entities";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /** False for a wrong password, and for anything that isn't a hash this hasher made. */
  verify(plain: string, stored: string): Promise<boolean>;
}

export type TokenClaims = { id: string; email: string; role: Role };

export interface TokenIssuer {
  /** A signed access token carrying `claims`. Lifetime is the adapter's policy. */
  issue(claims: TokenClaims): Promise<string>;
}
