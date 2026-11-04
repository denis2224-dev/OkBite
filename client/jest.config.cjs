module.exports = {
  preset: "jest-expo",
  testMatch: ["**/src/**/*.test.[jt]s?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|@react-navigation/.*|react-native-svg))",
  ],
};
