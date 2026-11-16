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
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  it.each(['ground', 'border', 'divider', 'soft', 'neutralBg'] as const)('tints the %s neutral toward the brand green, not yellow cream', key => {
    const [r, g, b] = rgb(colors[key]);
    expect(g).toBeGreaterThanOrEqual(r!);
    expect(g).toBeGreaterThanOrEqual(b!);
  });
  it('draws cards in pure white so they stand out from the page', () => {
    expect(colors.surface).toBe('#FFFFFF');
    expect(contrast(colors.surface, colors.ground)).toBeGreaterThan(1.05);
  });
  it('keeps the camera panel a deep forest-black, darker than any text colour', () => {
    const [r, g, b] = rgb(colors.cameraPanel);
    expect(g).toBeGreaterThan(r!);
    expect(g).toBeGreaterThan(b!);
    expect(contrast(colors.cameraInk, colors.cameraPanel)).toBeGreaterThanOrEqual(15);
  });
  it.each([
    ['ink on ground', 'ink', 'ground'], ['ink on surface', 'ink', 'surface'], ['ink on soft', 'ink', 'soft'],
    ['muted on ground', 'muted', 'ground'], ['muted on surface', 'muted', 'surface'], ['muted on soft', 'muted', 'soft'],
    ['neutral on neutralBg', 'neutral', 'neutralBg'], ['good on goodBg', 'good', 'goodBg'], ['medium on mediumBg', 'medium', 'mediumBg'],
    ['low on lowBg', 'low', 'lowBg'], ['primary on ground', 'primary', 'ground'],
  ] as const)('keeps %s at least 4.5:1', (_, fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
