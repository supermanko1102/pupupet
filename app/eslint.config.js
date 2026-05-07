// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNative = require('eslint-plugin-react-native');
const unusedImports = require('eslint-plugin-unused-imports');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'react-native': reactNative,
      'unused-imports': unusedImports,
    },
    rules: {
      'react-native/no-unused-styles': 'warn',
      'unused-imports/no-unused-imports': 'warn',
    },
  },
  {
    ignores: ['dist/*'],
  },
  prettierConfig,
]);

