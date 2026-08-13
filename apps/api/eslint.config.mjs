import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // NestJS dekoratorlari bo'sh konstruktor parametrlarini talab qiladi.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],
    },
  },
  {
    // Smoke test va seed skriptlari Node muhitida bevosita ishlaydi.
    files: ['test/**/*.mjs', 'scripts/**/*.mjs', 'prisma/seed.ts', '*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
