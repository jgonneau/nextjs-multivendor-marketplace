import { dirname } from "path";
import { fileURLToPath } from "url";
import { builtinModules } from "node:module";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // The frontend is a separate app, linted by its own config.
  { ignores: ["frontend/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Tests cast partial fixtures and mocks freely (`{ id: "u1" } as any`).
    files: ["**/*.test.ts", "**/*.test.tsx", "__test__/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // Hexagonal boundary: the core (domain, ports, use cases) depends on
    // nothing outside itself. Adapters plug in through core/ports and are
    // wired in container.ts. Tests may use real adapters, so they're exempt.
    files: ["core/**/*.ts"],
    ignores: ["core/**/*.test.ts"],
    rules: {
      // Resolves every import to a real file, so `@/adapters/...`,
      // `../../adapters/...` and packages in node_modules (zod, jose, ...)
      // are all caught, however they're written.
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./core",
              from: "./",
              except: ["./core"],
              message: "core/ must not depend on adapters or frameworks: add a port in core/ports and an adapter instead.",
            },
          ],
        },
      ],
      // Node built-ins don't resolve to files, so they're listed by name.
      "no-restricted-imports": [
        "error",
        {
          paths: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)].map((name) => ({
            name,
            message: "core/ must not depend on Node: add a port in core/ports and an adapter instead.",
          })),
        },
      ],
    },
  },
  {
    // Adapters get their dependencies passed in; only the routes (and
    // scripts) use the composition root.
    files: ["adapters/**/*.ts"],
    ignores: ["adapters/**/*.test.ts"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./adapters",
              from: "./container.ts",
              message: "Adapters must not import the composition root: take the dependency as a parameter and wire it in container.ts.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
