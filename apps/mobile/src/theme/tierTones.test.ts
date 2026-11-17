import { light } from './tokens';
import { tierTone } from './tierTones';

it.each([
  ['excellent', light.good, light.goodBg], ['good', light.goodTier, light.goodBg], ['fair', light.medium, light.mediumBg],
  ['poor', light.low, light.lowBg], ['bad', light.badTier, light.lowBg],
] as const)('colours the %s tier with its grade tone', (tier, fg, bg) => {
  expect(tierTone(tier)).toEqual({ fg, bg });
});
