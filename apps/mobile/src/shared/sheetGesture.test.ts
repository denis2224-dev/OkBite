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

import { claimsSheetDrag, sheetOffset } from './sheetGesture';

describe('claimsSheetDrag', () => {
  it('takes a downward, mostly vertical pull when the content is at its top', () => {
    expect(claimsSheetDrag(2, 12, 0)).toBe(true);
  });
  it('lets the content scroll instead when it is scrolled down', () => {
    expect(claimsSheetDrag(0, 30, 80)).toBe(false);
  });
  it('never takes an upward move (the sheet does not lift), a sideways one, or a tiny one', () => {
    expect(claimsSheetDrag(0, -30, 0)).toBe(false);
    expect(claimsSheetDrag(40, 12, 0)).toBe(false);
    expect(claimsSheetDrag(0, 3, 0)).toBe(false);
  });
});

it('keeps the sheet where it is when pulled up and follows the finger when pulled down', () => {
  expect(sheetOffset(-120)).toBe(0);
  expect(sheetOffset(0)).toBe(0);
  expect(sheetOffset(85)).toBe(85);
});
