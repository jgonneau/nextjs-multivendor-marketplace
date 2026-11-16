/**
 * Runs on `git commit` (.husky/pre-commit): ESLint on the staged files only.
 * The API (repo root) and the frontend (frontend/) each have their own ESLint
 * config and dependencies, so their files are linted separately.
 */
const quote = (files) => files.map((f) => JSON.stringify(f)).join(" ");
const isFrontend = (file) => file.includes("/frontend/");

const config = {
  "*.{ts,tsx,mjs}": (files) => {
    const api = files.filter((f) => !isFrontend(f));
    const frontend = files.filter(isFrontend);
    return [
      api.length && `pnpm exec eslint --fix --max-warnings=0 ${quote(api)}`,
      frontend.length && `pnpm --dir frontend exec eslint --fix --max-warnings=0 ${quote(frontend)}`,
    ].filter(Boolean);
  },
};

export default config;
