import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React config (flat config format)
  {
    ...reactPlugin.configs['flat']['recommended'],
    ...reactPlugin.configs['flat']['jsx-runtime'],
    ...reactHooks.configs.recommended,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
  },

  // Accessibility config (flat config format)
  {
    ...jsxA11y.flatConfigs.recommended,
    plugins: {
      'jsx-a11y': jsxA11y,
    },
  },

  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', '.vercel/', '*.config.js', '*.config.ts', 'supabase/**'],
  },

  // TypeScript / React specific rules
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strictness
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'warn',
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/no-unescaped-entities': 'warn',

      // React Hooks
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'off',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['warn', 'always'],
      'curly': ['warn', 'all'],
    },
  },

  // Test files - relax some rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Config files - more relaxed
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'tailwind.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
);