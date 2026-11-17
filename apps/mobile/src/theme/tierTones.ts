import type { Tier } from '@okbite/shared';
import { light } from './tokens';

type Tone = { fg: string; bg: string };
const good: Tone = { fg: light.good, bg: light.goodBg };
const medium: Tone = { fg: light.medium, bg: light.mediumBg };
const low: Tone = { fg: light.low, bg: light.lowBg };
// Five tones: forest, lighter green, amber, terracotta, deep terracotta. The tier word is always shown too.
const tones: Record<Tier, Tone> = { excellent: good, good: { fg: light.goodTier, bg: light.goodBg }, fair: medium, poor: low, bad: { fg: light.badTier, bg: light.lowBg } };

/** The product-score tier drawn in the grade colours. Light only. */
export function tierTone(tier: Tier): Tone {
  return tones[tier];
}
