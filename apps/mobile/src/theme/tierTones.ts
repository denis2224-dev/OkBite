import type { Tier } from '@okbite/shared';
import { light } from './tokens';

type Tone = { fg: string; bg: string };
const good: Tone = { fg: light.good, bg: light.goodBg };
const medium: Tone = { fg: light.medium, bg: light.mediumBg };
const low: Tone = { fg: light.low, bg: light.lowBg };
const tones: Record<Tier, Tone> = { excellent: good, good, fair: medium, poor: low, bad: low };

/** The product-score tier drawn in the grade colours. Light only. */
export function tierTone(tier: Tier): Tone {
  return tones[tier];
}
