const { preset: _nativePreset, ...base } = require("./jest.config.cjs");
const web = require("jest-expo/web/jest-preset");
module.exports = {
  ...base,
  ...web,
  testMatch: ["<rootDir>/test/**/*.web.spec.jsx"],
  transformIgnorePatterns: base.transformIgnorePatterns,
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    ...web.moduleNameMapper,
    "^@react-native/assets-registry/registry$":
      require.resolve("react-native/asset-registry"),
  },
};
