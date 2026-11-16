/**
 * Password hashing with Node's built-in scrypt (no native dependency).
 *
 * Stored format: `scrypt$N$r$p$<salt b64>$<hash b64>`. The parameters live in
 * the string itself, so they can be raised later without breaking existing
 * hashes. Server-only: this uses node:crypto and must never be imported from
 * middleware.ts (Edge runtime).
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { PasswordHasher } from "@/core/ports/security";

const PREFIX = "scrypt";
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function derive(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derive(password, salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return [PREFIX, N, r, p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function isPasswordHash(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}$`);
}

/** Constant-time check of `password` against a stored hash. Never throws. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  try {
    const actual = await derive(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** The core's PasswordHasher port, backed by the scrypt functions above. */
export class ScryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hashPassword(plain);
  }
  verify(plain: string, stored: string): Promise<boolean> {
    return verifyPassword(plain, stored);
  }
}
