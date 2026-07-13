jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock')
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/lib/module/mock');

  if (Reanimated.default) {
    Reanimated.default.call = () => undefined;
  }

  return Reanimated;
});
