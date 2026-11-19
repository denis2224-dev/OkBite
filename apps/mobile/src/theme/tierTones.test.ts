import { light } from './tokens';
import { tierTone } from './tierTones';

it.each([
  ['excellent', light.primary, light.onPrimary, light.primary],
  ['good', light.greenLight, light.ink, light.primaryDark],
  ['fair', light.sand, light.ink, light.textSecondary],
  ['poor', light.dangerBg, light.dangerText, light.dangerText],
  ['bad', light.dangerBg, light.dangerText, light.dangerText],
] as const)('colours the %s tier like the CALM grades', (tier, fill, onFill, word) => {
  expect(tierTone(tier)).toEqual({ fill, onFill, word });
});
