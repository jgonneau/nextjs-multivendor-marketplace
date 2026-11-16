// One-off migration: hashes every plaintext password still in the database
// and clears stored login tokens (tokens issued before this change embed the
// plaintext password in their payload). Safe to re-run: rows already hashed
// are skipped. Affected users simply log in again to get a new token.
//
//   pnpm db:hash-passwords            (uses DATABASE_URL from .env)
import prismaPkg from "../prisma/generated/prisma/index.js";
import { hashPassword, isPasswordHash } from "../adapters/security/password.ts";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

try {
  const users = await prisma.user.findMany({ select: { id: true, password: true } });
  const plaintext = users.filter((u) => !isPasswordHash(u.password));

  for (const user of plaintext) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(user.password), token: null },
    });
  }
  console.log(`Hashed ${plaintext.length} of ${users.length} user passwords.`);
} finally {
  await prisma.$disconnect();
}
