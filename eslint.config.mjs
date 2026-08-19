import nx from '@nx/eslint-plugin';
import projectConfig from './eslint.project.config.mjs';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  { ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*', '**/vite.config.*.timestamp*', '**/test-output', '**/test-results'] },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        enforceBuildableLibDependency: true,
        allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
        depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
      }],
    },
  },
  { files: ['**/*.ts','**/*.tsx','**/*.cts','**/*.mts','**/*.js','**/*.jsx','**/*.cjs','**/*.mjs'], rules: {} },
  ...projectConfig,
];
