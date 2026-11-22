/* global jest */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
// Reanimated 4 and its worklets runtime have no native side in Jest (its own mock still loads the native
// initializers), so a small stand-in: shared values are plain objects, springs land at once, styles are computed once.
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (fn, ...args) => fn(...args), runOnJS: fn => fn }));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const interpolate = (x, input, output) => {
    if (x <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) if (x <= input[i]) return output[i - 1] + (output[i] - output[i - 1]) * (x - input[i - 1]) / (input[i] - input[i - 1]);
    return output[output.length - 1];
  };
  return { __esModule: true, default: { View, createAnimatedComponent: component => component }, interpolate, useEvent: () => undefined, useSharedValue: value => { const shared = { value, get: () => shared.value, set: next => { shared.value = next; } }; return shared; }, useAnimatedStyle: fn => fn(), withSpring: value => value };
});
require('react-native-gesture-handler/jestSetup');
