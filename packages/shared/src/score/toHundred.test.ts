import { expect, it } from 'vitest';
import { letterFor, POINTS_RANGE, type PointsKind } from './nutriscore';
import { toHundred } from './toHundred';

const score = (points: number, kind: PointsKind) => toHundred(points, letterFor(points, kind), kind);

it('best general points → 100, worst → 0', () => {
  expect(score(-17, 'general')).toBe(100);
  expect(score(55, 'general')).toBe(0);
});

it('first points value of B → 79, last of C → 40', () => {
  expect(score(1, 'general')).toBe(79);
  expect(score(10, 'general')).toBe(40);
});

it('water is always 100', () => expect(toHundred(0, 'A', 'water')).toBe(100));

it.each(Object.keys(POINTS_RANGE) as PointsKind[])('%s stays within 0–100 and never rises with points', (kind) => {
  const [min, max] = POINTS_RANGE[kind];
  let previous = 101;
  for (let p = min; p <= max; p++) {
    const s = score(p, kind);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeLessThanOrEqual(previous);
    previous = s;
  }
});

it('beverages start at B: their best points give 79', () => {
  expect(score(-18, 'beverage')).toBe(79);
});
