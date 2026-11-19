import type { Tier } from '@okbite/shared';
import { light } from './tokens';

/** `fill` for badges and bars, `onFill` for text on that fill, `word` for the tier name on the page. */
export type Tone = { fill: string; onFill: string; word: string };
const excellent: Tone = { fill: light.primary, onFill: light.onPrimary, word: light.primary };
const good: Tone = { fill: light.greenLight, onFill: light.ink, word: light.primaryDark };
const fair: Tone = { fill: light.sand, onFill: light.ink, word: light.textSecondary };
const weak: Tone = { fill: light.dangerBg, onFill: light.dangerText, word: light.dangerText };
const tones: Record<Tier, Tone> = { excellent, good, fair, poor: weak, bad: weak };

/** CALM grades: Excelent = primary, Bun = greenLight, Mediu = sand, Slab and Foarte slab = danger. Light only. */
export function tierTone(tier: Tier): Tone {
  return tones[tier];
}
