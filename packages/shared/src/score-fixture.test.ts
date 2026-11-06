import { expect, it } from 'vitest';
import { ScoreFixture } from './contract';

const fixture = {
  name: 'Synthetic contract fixture', scoreKind: 'beverage',
  nutrients: { kcal: 1, fat: 0, sat: 0, sugar: 0, salt: 0, protein: 0, fiber: 0, fruitVegPct: null },
  expectedPoints: 4, expectedLetter: 'C', checkedWith: 'Synthetic schema test; not food verification',
};

it('retains optional ingredient text for sweetener-aware fixtures without invalidating existing records', () => {
  expect(ScoreFixture.parse(fixture)).toEqual(fixture);
  expect(ScoreFixture.parse({ ...fixture, ingredientsText: null }).ingredientsText).toBeNull();
  expect(ScoreFixture.parse({ ...fixture, ingredientsText: 'apă, E950' }).ingredientsText).toBe('apă, E950');
  expect(ScoreFixture.safeParse({ ...fixture, ingredientsText: 950 }).success).toBe(false);
});
