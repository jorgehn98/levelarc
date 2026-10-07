const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // React Compiler purity rules. The compiler is not enabled here and they flag the standard
    // RN patterns this app relies on: Animated.Value held in a ref, Reanimated `shared.value = x`
    // and icon components resolved from a static lookup table.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', '.expo-export-check/*', 'docs/**', '.agents/**', 'src/db/migrations/**'],
  },
]);
