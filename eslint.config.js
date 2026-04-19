import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow `catch {}` as an explicit no-op for best-effort localStorage / JSON parse calls.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Opinionated rule from the newer react-hooks plugin; suspend for now — the existing
      // useEffect+setState patterns are load-state flags, not cascading renders.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
