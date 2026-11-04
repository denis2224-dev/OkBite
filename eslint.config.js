const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  // Zod schemas intentionally share names with their inferred TypeScript types.
  {
    files: ["src/data/models/*.ts", "packages/shared/src/contract.ts"],
    rules: { "@typescript-eslint/no-redeclare": "off" },
  },
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      ".worktrees/**",
      ".agents/**",
      ".pnpm-store/**",
      "design/**",
      "docs/**",
      "graphify-out/**",
      ".superpowers/**",
      "supabase/functions/_shared/**",
    ],
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: Object.fromEntries(
        ["jest", "it", "expect", "beforeEach", "afterEach", "describe"].map(
          (key) => [key, "readonly"],
        ),
      ),
    },
  },
]);
