import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'packages/design-tokens/tokens.css',
      'packages/design-tokens/tokens.export.json',
      'apps/web/next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Dot-notation on process.env fights noUncheckedIndexedAccess; we use
      // bracket access deliberately and typed narrowing at the boundary.
      'dot-notation': 'off',
    },
  },

  // --- The content package must stay framework-free -------------------------
  // The video and social pipelines import it under plain Node. A single
  // `next/*` import breaks them at run time rather than at build time, so it is
  // an error here. See docs/PLAN.md §2.3.
  {
    files: ['packages/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', 'react', 'react-dom', 'react/*'],
              message:
                '@wff/content must run under plain Node for the video and social pipelines. No framework imports.',
            },
          ],
        },
      ],
    },
  },

  // --- The web app ----------------------------------------------------------
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks, '@next/next': next },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // App Router only. This rule looks for a pages/ directory and warns on
      // every run when it does not find one.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // --- Zero hard-coded user-facing strings ----------------------------------
  // Every string a reader can see lives in a catalogue, or tier-1 and tier-2
  // translation silently skip it. This is the rule BRIEF §7 asks for.
  // `ignoreProps` is required or every className trips it.
  {
    files: ['apps/web/src/app/**/*.tsx', 'apps/web/src/components/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: ['-', '·', '/', ':', '%', '+', '(', ')', ',', '.'],
        },
      ],
    },
  },

  // --- Scripts and config ---------------------------------------------------
  {
    files: ['scripts/**/*.mjs', 'packages/*/src/build.mjs', '*.mjs'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
    },
  },
);
