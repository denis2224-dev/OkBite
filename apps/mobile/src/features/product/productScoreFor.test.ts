import { productScore } from '@okbite/shared';
import { foundYogurt } from '../../test/fixtures';
import { displayScore } from './displayScore';
import { productScoreFor, tierGrade } from './productScoreFor';

const { product, score } = foundYogurt;

it('scores the displayed nutrition, the same number every screen shows', () => {
  const result = productScoreFor(product, score);
  expect(result).toEqual(productScore(product, displayScore(product, score)));
  expect(result.score).not.toBeNull();
  expect(100 - result.deductions.reduce((sum, d) => sum + d.points, 0)).toBe(result.score);
});

it('gives no number and no tier when nutrition is unavailable', () => {
  const missing = { ...product, nutrients: { ...product.nutrients, salt: null } };
  expect(productScoreFor(missing, score)).toEqual({ score: null, tier: null, deductions: [] });
});

it('caps a product with a high-risk additive at 49', () => {
  const additive = { ...product.ingredients[0]!, slug: 'e338', name: 'E338', group: 'add' as const, risk: 'high' as const, riskSource: 'https://efsa.europa.eu/x' };
  const risky = { ...product, ingredients: [...product.ingredients, additive] };
  expect(productScoreFor(risky, score).score).toBeLessThanOrEqual(49);
});

it('maps tiers to the three colour grades', () => {
  expect([tierGrade('excellent'), tierGrade('good'), tierGrade('fair'), tierGrade('poor'), tierGrade('bad'), tierGrade(null)])
    .toEqual(['good', 'good', 'medium', 'low', 'low', 'neutral']);
});
