import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // 1. Игнорируемые папки
  { ignores: ['dist'] },

  // 2. Стандартные конфиги JS
  js.configs.recommended,

  // 3. Конфиг React Hooks
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Пользовательские правила
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
  },

  // 4. ВАЖНО: Prettier конфиг должен быть ПОСЛЕДНИМ в списке,
  // чтобы перекрыть любые конфликтующие правила форматирования.
  eslintConfigPrettier,
];
