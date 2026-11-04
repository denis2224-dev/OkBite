const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  { ignores: ["dist/**", "coverage/**"] },
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
