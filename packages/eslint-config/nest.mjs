import tseslint from 'typescript-eslint';

import base from './base.mjs';

export default tseslint.config(
  ...base,
  { ignores: ['src/generated/**', 'prisma/migrations/**'] },
  {
    files: ['**/*.ts'],
    rules: {
      // Модули Nest — это классы без членов, для DI так и надо.
      '@typescript-eslint/no-extraneous-class': 'off',
      // Декораторы и типы Express/Passport дают много any на границах —
      // держим как предупреждение, чтобы не блокировать сборку.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
    },
  },
);
