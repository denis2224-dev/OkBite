module.exports = {
  roots: ["<rootDir>/src", "<rootDir>/test"],
  modulePathIgnorePatterns: ["<rootDir>/.worktrees/", "<rootDir>/.agents/"],
  preset: "jest-expo",
  testMatch: ["<rootDir>/test/**/*.test.[jt]s?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|@react-navigation/.*|react-native-svg))",
  ],
};
