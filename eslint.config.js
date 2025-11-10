import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginImport from 'eslint-plugin-import';
import pluginPromise from 'eslint-plugin-promise';
import pluginN from 'eslint-plugin-n';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: rootDir
      }
    },
    plugins: {
      import: pluginImport,
      promise: pluginPromise,
      n: pluginN
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
);

