import type { Tier } from '@okbite/shared';
import { light } from './tokens';

/** `fg`/`bg`: Option A grade colours. `fill`/`onFill`/`word`: the CALM kit's badges and bars. Light only. */
export type Tone = { fg: string; bg: string; fill: string; onFill: string; word: string };
const tones: Record<Tier, Tone> = {
  excellent: { fg: light.good, bg: light.goodBg, fill: light.primary, onFill: light.onPrimary, word: light.primary },
  good: { fg: light.goodTier, bg: light.goodBg, fill: light.greenLight, onFill: light.ink, word: light.primaryDark },
  fair: { fg: light.medium, bg: light.mediumBg, fill: light.sand, onFill: light.ink, word: light.textSecondary },
  poor: { fg: light.low, bg: light.lowBg, fill: light.dangerBg, onFill: light.dangerText, word: light.dangerText },
  bad: { fg: light.low, bg: light.lowBg, fill: light.dangerBg, onFill: light.dangerText, word: light.dangerText },
};

export function tierTone(tier: Tier): Tone {
  return tones[tier];
}
