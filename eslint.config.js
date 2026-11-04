const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  {
    ignores: [
      '**/.expo/**',
      '**/dist/**',
      '**/coverage/**',
      'docs/**',
      'graphify-out/**',
      '.superpowers/**',
      'supabase/functions/_shared/**',
    ],
  },
  expo,
  { files: ['**/*.{ts,tsx,mts,cts}'], extends: [tseslint.configs.recommended] },
]);
