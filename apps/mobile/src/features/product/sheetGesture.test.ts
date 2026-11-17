import { shouldDismiss } from './sheetGesture';

it.each([
  ['a long pull down', 140, 0.1, true],
  ['a quick flick down', 40, 1.2, true],
  ['a short slow pull', 40, 0.2, false],
  ['a pull up', -200, -2, false],
  ['a tiny flick', 10, 2, false],
])('%s → dismiss %s', (_, dy, vy, expected) => {
  expect(shouldDismiss(dy, vy)).toBe(expected);
});
