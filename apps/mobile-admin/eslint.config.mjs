import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.expo/**', '.expo-bundle/**', 'node_modules/**', 'expo-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Offline navbatdagi qiymatlar `!` bilan tekshirilgandan keyin ishlatiladi.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Metro va Babel sozlamalari CommonJS'da Node muhitida ishlaydi.
    files: ['metro.config.js', 'babel.config.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
