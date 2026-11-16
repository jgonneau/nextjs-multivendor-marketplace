import { execFileSync } from "node:child_process";
import { defineConfig } from "cypress";

/**
 * End-to-end tests against a running frontend (default: the docker compose
 * one on :3000). Override with CYPRESS_BASE_URL.
 *
 * - landing + demo-* specs only need the frontend: the demo runs on sample data.
 * - auth spec talks to the real API and creates throwaway accounts named
 *   e2e-…@example.test, which the `deleteE2eUsers` task removes afterwards
 *   from the database in the compose `db` container.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    retries: { runMode: 1, openMode: 0 },
    env: {
      dbContainer: "nextjs-multivendor-marketplace-db-1",
      dbUser: "testuser",
      dbName: "postgres",
    },
    setupNodeEvents(on, config) {
      on("task", {
        deleteE2eUsers() {
          const { dbContainer, dbUser, dbName } = config.env;
          const sql = `DELETE FROM "User" WHERE email LIKE 'e2e-%@example.test'`;
          try {
            const out = execFileSync(
              "docker",
              ["exec", dbContainer, "psql", "-U", dbUser, "-d", dbName, "-tAc", sql],
              { encoding: "utf8" }
            );
            return out.trim();
          } catch (error) {
            // Cleanup is best effort: don't fail the run over it.
            console.warn(`Could not delete e2e users: ${(error as Error).message}`);
            return null;
          }
        },
      });
      return config;
    },
  },
});
