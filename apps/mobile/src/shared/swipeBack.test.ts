import { shouldGoBack, swipeBackEnabled } from './swipeBack';

it.each([
  ['a long pull to the right', 90, 10, 0.2, true],
  ['a quick flick to the right', 30, 4, 0.8, true],
  ['a short slow pull', 30, 4, 0.2, false],
  ['a pull to the left', -120, 0, -1, false],
  ['a mostly vertical drag', 70, 90, 0.5, false],
])('%s → back %s', (_, dx, dy, vx, expected) => {
  expect(shouldGoBack(dx, dy, vx)).toBe(expected);
});

it.each(['/', '/history', '/compare', '/allergies', '/profile'])('is off on the nav-bar page %s', path => {
  expect(swipeBackEnabled(path)).toBe(false);
});
it.each(['/product/abc', '/product/abc/ingredients', '/settings', '/about', '/capture', '/offline', '/method'])('is on for the opened page %s', path => {
  expect(swipeBackEnabled(path)).toBe(true);
});
