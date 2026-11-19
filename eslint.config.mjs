import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.idea/**',
      '.engram/**',
      '.graphify/**',
      'graphify-out/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['web/src/common/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/**', '**/app/**'],
              message:
                'Keep shared frontend code independent of application and feature modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['api/src/{common,database}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/**'],
              message:
                'Keep shared and database code independent of feature modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'api/**/*.{ts,mjs,cjs}',
      'web/playwright.config.ts',
      '*.mjs',
      '*.cjs',
    ],
    languageOptions: { globals: globals.node },
  },
);
