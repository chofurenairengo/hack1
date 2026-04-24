import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'src/types/supabase.ts',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next/*', 'next'],
              importNames: ['*'],
              message:
                'Domain layer must not import Next.js. Move framework-dependent code to infrastructure or app layers.',
            },
          ],
        },
      ],
    },
    files: ['src/domain/**/*.ts', 'src/domain/**/*.tsx'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*'],
              message: 'Domain layer must not import Supabase. Use repository interfaces instead.',
            },
          ],
        },
      ],
    },
    files: ['src/domain/**/*.ts', 'src/domain/**/*.tsx'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/**', '../infrastructure/**', '../../infrastructure/**'],
              message:
                'Application layer must not import infrastructure directly. Use port interfaces.',
            },
          ],
        },
      ],
    },
    files: ['src/application/**/*.ts', 'src/application/**/*.tsx'],
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Use @/shared/config/env instead of process.env directly to ensure startup validation.',
        },
      ],
    },
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/shared/config/env.ts', 'src/shared/config/env.server.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
    files: ['src/**/*.ts', 'src/**/*.tsx'],
  },
]);

export default eslintConfig;
