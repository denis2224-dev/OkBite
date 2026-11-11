import { historyTier } from './tierLabel';
it.each([
  [0, 'bad'], [19, 'bad'], [20, 'poor'], [39, 'poor'], [40, 'fair'],
  [59, 'fair'], [60, 'good'], [79, 'good'], [80, 'excellent'], [100, 'excellent'],
])('labels %s as %s without changing the score', (score, tier) => {
  expect(historyTier(score as number)).toBe(tier);
});
