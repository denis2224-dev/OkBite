/* global __dirname */
const path = require('node:path');
const web = require('jest-expo/web/jest-preset');
module.exports = {
  ...web,
  rootDir: path.resolve(__dirname, '../../..'),
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/features/settings/SettingsScreen.dom-check.jsx'],
  moduleNameMapper: { ...web.moduleNameMapper, '^react-native$': 'react-native-web', '^@react-native/assets-registry/registry$': require.resolve('react-native/asset-registry') },
  transformIgnorePatterns: require('../../../../../jest.config.cjs').transformIgnorePatterns,
};
