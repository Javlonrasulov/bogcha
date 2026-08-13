import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Ishlatilmagan `_` prefiksli argumentlar ataylab qoldiriladi.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Server komponentlarida `any` ishlatilmaydi, lekin ogohlantirish yetarli.
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Smoke test skriptlari Node muhitida bevosita ishlaydi.
    files: ['test/**/*.mjs', '*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
