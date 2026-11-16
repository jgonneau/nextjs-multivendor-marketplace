import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // ...
    "^@/components/(.*)$": "<rootDir>/components/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // The frontend is a separate app; only its contract files are imported
  // (by __test__/frontend-contract.test.ts), never its build or packages.
  modulePathIgnorePatterns: ["<rootDir>/frontend/(node_modules|\\.next)/"],
  globalSetup: "<rootDir>/__test__/globalSetup.ts",
  // jose (ESM only) is transformed via `transpilePackages` in next.config.ts;
  // next/jest reads it from there.
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
