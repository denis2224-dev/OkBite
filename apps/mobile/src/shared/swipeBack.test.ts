import { shouldGoBack, swipeBackEnabled, usesCustomSwipe } from './swipeBack';

it.each([
  ['a long pull to the right', 90, 10, 0.2, true],
  ['a quick flick to the right', 30, 4, 0.8, true],
  ['a short slow pull', 30, 4, 0.2, false],
  ['a pull to the left', -120, 0, -1, false],
  ['a mostly vertical drag', 70, 90, 0.5, false],
])('%s → back %s', (_, dx, dy, vx, expected) => {
  expect(shouldGoBack(dx, dy, vx)).toBe(expected);
});

it.each(['/', '/history', '/compare', '/profile'])('is off on the nav-bar page %s', path => {
  expect(swipeBackEnabled(path)).toBe(false);
});
it.each(['/product/abc', '/product/abc/ingredients', '/settings', '/about', '/preferences/allergens', '/preferences/dietary', '/capture', '/offline', '/method'])('is on for the opened page %s', path => {
  expect(swipeBackEnabled(path)).toBe(true);
});

describe('usesCustomSwipe', () => {
  it('is never used on a nav-bar page', () => {
    for (const path of ['/', '/history', '/compare', '/profile']) for (const platform of ['ios', 'android', 'web']) expect(usesCustomSwipe(path, platform)).toBe(false);
  });
  it('is used on every page of the web', () => {
    for (const path of ['/product/abc', '/settings', '/preferences/dietary', '/capture']) expect(usesCustomSwipe(path, 'web')).toBe(true);
  });
  it('on a phone is never used, because the stack swipes every pushed page itself (Setări and Despre included)', () => {
    for (const path of ['/settings', '/about', '/product/abc', '/preferences/allergens', '/method', '/identify', '/add', '/offline']) {
      expect(usesCustomSwipe(path, 'ios')).toBe(false);
      expect(usesCustomSwipe(path, 'android')).toBe(false);
    }
  });
});

describe('the top products page', () => {
  it('gets swipe-back like the other pushed pages', () => {
    expect(swipeBackEnabled('/top-products')).toBe(true);
    expect(usesCustomSwipe('/top-products', 'web')).toBe(true); // a drag that follows the finger on the web
    expect(usesCustomSwipe('/top-products', 'ios')).toBe(false); // the native stack swipes it on a phone
    expect(usesCustomSwipe('/preferences/dietary', 'ios')).toBe(usesCustomSwipe('/top-products', 'ios'));
  });
});
