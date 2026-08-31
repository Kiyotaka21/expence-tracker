import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

import { commonIgnores } from './base.mjs';

// Важно: конфиг Next не композитится с ./base.mjs — eslint-config-next уже
// подключает typescript-eslint, react и react-hooks, а повторное определение
// того же плагина в flat-config приводит к ошибке ESLint.
export default [
  { ignores: [...commonIgnores, 'next-env.d.ts', 'out/**'] },
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
