import { expect, it } from 'vitest';
import { ScoreResult } from '../contract';
import { computeScore } from './index';

it('keeps scores unavailable until R3 supplies C4', () => {
  const nutrients = { kcal: null, fat: null, sat: null, sugar: null, salt: null,
    protein: null, fiber: null, fruitVegPct: null };
  expect(ScoreResult.parse(computeScore(nutrients, 'general'))).toEqual({
    score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
  });
});
