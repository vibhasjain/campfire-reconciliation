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
      globals: globals.browser,
    },
    rules: {
      // lucide's dynamic loader emits ~1,800 chunks; custom-object/field icons use a fixed map.
      'no-restricted-imports': ['error', {
        paths: [{ name: 'lucide-react/dynamic', message: 'use OBJECT_ICONS from @/components/common/icons' },
          { name: 'lucide-react/dynamicIconImports', message: 'use OBJECT_ICONS from @/components/common/icons' }],
      }],
    },
  },
])
