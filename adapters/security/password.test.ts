/**
 * @jest-environment node
 */
import { hashPassword, isPasswordHash, verifyPassword } from "@/adapters/security/password";

describe("password hashing", () => {
  test("a hash verifies against its own password only", async () => {
    const hash = await hashPassword("correct horse");
    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("correct horsE", hash)).resolves.toBe(false);
  });

  test("the same password hashes differently each time (random salt)", async () => {
    expect(await hashPassword("pw")).not.toBe(await hashPassword("pw"));
  });

  test.each(["pw", "", "scrypt$", "scrypt$1$2$3$bad$bad", "bcrypt$x$y$z$a$b"])(
    "a malformed or plaintext stored value (%p) never verifies",
    async (stored) => {
      await expect(verifyPassword("pw", stored)).resolves.toBe(false);
    }
  );
});
