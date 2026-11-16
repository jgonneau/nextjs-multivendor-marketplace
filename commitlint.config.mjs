/**
 * Conventional Commits: `type(scope): subject`, e.g. `feat(core): split orders per shop`.
 * Checked on pull requests by CI (every commit in the PR). Locally,
 * .husky/commit-msg checks the same format with a regex.
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Subjects may start with a proper name: "Prisma schema…", "OpenAPI spec…".
    "subject-case": [0],
    // Bodies are written as paragraphs; GitHub wraps them.
    "body-max-line-length": [0],
    // Known scopes; anything else is a warning, not an error.
    "scope-enum": [
      1,
      "always",
      ["core", "adapters", "http", "api", "db", "docs", "frontend", "e2e", "docker", "ci", "deps"],
    ],
  },
};

export default config;
