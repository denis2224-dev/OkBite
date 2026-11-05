const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  {
    ignores: [
      '**/.expo/**',
      '.agents/**',
      '.worktrees/**',
      '.pnpm-store/**',
      'design/**',
      '**/dist/**',
      '**/dist-native/**',
      '**/dist-e2e/**',
      'test-results/**',
      'playwright-report/**',
      '**/coverage/**',
      'docs/**',
      'graphify-out/**',
      '.superpowers/**',
      'supabase/functions/_shared/**',
    ],
  },
  expo,
  { files: ['**/*.{ts,tsx,mts,cts}'], extends: [tseslint.configs.recommended] },
  {
    files: ['src/data/models/*.ts'],
    rules: { '@typescript-eslint/no-redeclare': 'off' },
  },
  {
    files: ['test/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: Object.fromEntries(
        ['jest', 'test', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'describe']
          .map((name) => [name, 'readonly']),
      ),
    },
  },
  {
    files: ['supabase/functions/**/*.ts', 'supabase/ops/**/*.ts'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:', '^@supabase/supabase-js$'] }] },
  },
]);
