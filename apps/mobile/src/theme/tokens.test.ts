import { light } from './tokens';
import { letterTones } from './letterTones';
import { tierTone } from './tierTones';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('light palette', () => {
  const colors = light;
  it('draws the keyboard focus ring with at least 3:1 contrast on every page surface', () => {
    for (const background of [colors.ground, colors.surface, colors.soft]) {
      expect(contrast(colors.focus, background)).toBeGreaterThanOrEqual(3);
    }
  });
  it.each(['excellent', 'good', 'fair', 'poor', 'bad'] as const)('keeps white score-tag text at least 4.5:1 on the %s tier', tier => {
    expect(contrast(colors.onPrimary, tierTone(tier).fg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['A', 'B', 'C', 'D', 'E'] as const)('keeps the letter at least 4.5:1 on the selected %s segment', letter => {
    expect(contrast(letterTones.onSelected, letterTones[letter].fg)).toBeGreaterThanOrEqual(4.5);
  });
});
