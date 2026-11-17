import { tierFor } from '@okbite/shared';
import { summarizeBasket } from './basket';
import type { HistoryEntry } from './store';
import { previewEntries } from '../../test/fixtures';
import { productScoreFor } from '../product/productScoreFor';

const at = (i: number) => `2026-11-1${i}T09:00:00.000Z`;
const all: HistoryEntry[] = previewEntries.map((entry, i) => ({ ...entry, savedAt: at(i) }));
const scoreOf = (e: HistoryEntry) => productScoreFor(e.product, e.score).score;

it('returns nothing when no saved product has a score', () => {
  expect(summarizeBasket([])).toBeNull();
  const unscored = all.filter(e => scoreOf(e) === null);
  expect(unscored.length).toBeGreaterThan(0);
  expect(summarizeBasket(unscored)).toBeNull();
});

it('averages the product scores, rounds, and names the tier of that average', () => {
  const scores = all.map(scoreOf).filter((s): s is number => s !== null);
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const basket = summarizeBasket(all)!;
  expect(basket.average).toBe(average);
  expect(basket.tier).toBe(tierFor(average));
  expect(basket.scored).toBe(scores.length);
  expect(basket.unscored).toBe(all.length - scores.length);
});

it('counts products per tier', () => {
  const basket = summarizeBasket(all)!;
  const expected = { excellent: 0, good: 0, fair: 0, poor: 0, bad: 0 };
  for (const e of all) { const { tier } = productScoreFor(e.product, e.score); if (tier) expected[tier]++; }
  expect(basket.mix).toEqual(expected);
});

it('picks the best-scoring product, and the newest one on a tie', () => {
  const best = summarizeBasket(all)!.best;
  const top = Math.max(...all.map(scoreOf).filter((s): s is number => s !== null));
  expect(best.score).toBe(top);
  const winner = all.find(e => scoreOf(e) === top)!;
  const newer: HistoryEntry = { ...winner, product: { ...winner.product, id: 'twin', name: 'Geamăn nou' }, savedAt: '2026-12-01T09:00:00.000Z' };
  const tie = summarizeBasket([...all, newer])!;
  expect(tie.best.name).toBe('Geamăn nou');
});
