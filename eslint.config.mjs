import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  { ignores: ['gen/**', 'node_modules/**', '.next/**', 'out/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message:
            "Don't use `window` directly (SSR). Use getWindow() in windowUtils",
        },
      ],
      // Preserve the existing hooks lint policy during the ESLint 9 migration.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
]
