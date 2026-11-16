/**
 * Runs once, before any test suite.
 *
 * 1. Refuses to run unless DATABASE_URL points at a database whose name ends
 *    in `_test` (it comes from `.env.test`, which next/jest loads because Jest
 *    sets NODE_ENV=test). This guard is what keeps tests away from dev data.
 * 2. Rebuilds that database from the Prisma migrations, so the schema always
 *    matches the code.
 *
 * The database is left empty: every test creates the records it needs
 * through __test__/helpers/factories.ts.
 */
import { execSync } from "node:child_process";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". ` +
        `DATABASE_URL must point at a *_test database (see .env.test).`
    );
  }

  execSync("pnpm exec prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "ignore",
    env: process.env,
  });
}
