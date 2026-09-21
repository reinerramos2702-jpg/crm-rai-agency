/** ESLint 8 — revisión de seguridad + higiene (Etapa 5, rama security/fase-0).
 * Enfocado en reglas de seguridad (error). Deuda pre-existente (unused vars
 * legacy, react-hooks) sin plugin de React full = warning/no reportado, para
 * que el lint sea verde ya y no bloquee CI por ruido viejo no relacionado.
 */
module.exports = {
  root: true,
  env: { browser: true, es2023: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'security', 'react-hooks', '@next/next'],
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'public/tutorials/',
    '**/*.d.ts',
    'tests/e2e/',
    'playwright.config.ts',
    'scripts/generate-tutorial-slides.py',
    'docs/',
  ],
  rules: {
    // --- Seguridad (error, es el objetivo del lint) ---
    'security/detect-unsafe-regex': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    '@typescript-eslint/no-var-requires': 'error',
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-debugger': 'error',
    'no-async-promise-executor': 'error',
    'no-fallthrough': 'error',
    // Streaming de la AI SDK usa while(true) con break controlado — no es un loop real infinito.
    'no-constant-condition': ['error', { checkLoops: false }],
    // <img> heredado sin next/image: warning (no bloquea), alineado con el plugin oficial.
    '@next/next/no-img-element': 'warn',

    // --- Higiene (warning — deuda pre-existente no bloquea CI) ---
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'no-empty': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  overrides: [
    {
      // TypeScript ya hace estos chequeos en compilación; las reglas
      // de JS puro producen falsos positivos con types/interfaces TS.
      files: ['**/*.{ts,tsx}'],
      rules: {
        'no-undef': 'off',
        'no-redeclare': 'off', // TS maneja declaration merging de interfaces
      },
    },
  ],
};