import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import babelParser from '@babel/eslint-parser'

// typescript-eslint doesn't support TypeScript 7 yet (the new native
// compiler) — https://github.com/typescript-eslint/typescript-eslint/issues/10940.
// Babel's parser strips TS/JSX syntax independently of the `typescript`
// package entirely, so ESLint can still parse .ts/.tsx files without being
// tied to whatever TS version this repo happens to run. The tradeoff: no
// type-aware lint rules, and the two rules below become unreliable on TS
// files specifically (see the comment on that block).
export default [
  {
    ignores: ['out/**', 'release/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-typescript', '@babel/preset-react']
        }
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  {
    // Babel erases TS-only syntax (interfaces, type positions) before ESLint
    // ever sees it, so core no-undef/no-unused-vars misfire on valid TS —
    // e.g. a type used only as a return-type annotation looks "unused" once
    // types are stripped, and interface bodies can look like broken object
    // literals. `tsc --noEmit` (with noUnusedLocals/noUnusedParameters) is
    // the accurate place for this check in this codebase; keep both rules
    // for plain JS files only (there's just eslint.config.mjs itself).
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    }
  }
]
