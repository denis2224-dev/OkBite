import { light, softShadow } from './tokens';
import { letterTones } from './letterTones';
import { tierTone } from './tierTones';
import { comparisonTokens } from './comparison';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const tiers = ['excellent', 'good', 'fair', 'poor', 'bad'] as const;

describe('Moss palette (Forest, Sage, Ivory, Ink)', () => {
  const colors = light;
  it('uses the Moss base colours', () => {
    expect(colors.primary).toBe('#2F5136');
    expect(colors.primaryPressed).toBe('#25412B');
    expect(colors.sage).toBe('#A9BEA0');
    expect(colors.sageSoft).toBe('#DDE5D6');
    expect(colors.ground).toBe('#F2EFE8');
    expect(colors.surface).toBe('#F8F6F1');
    expect(colors.ink).toBe('#2A2B29');
  });
  it('keeps every Forest role on the one primary green', () => {
    for (const key of ['hero', 'favorable', 'themeSelected', 'good', 'focus'] as const) expect(colors[key]).toBe(colors.primary);
  });
  it('keeps every soft-fill role on sage soft', () => {
    for (const key of ['soft', 'mint', 'neutralBg', 'themeButton'] as const) expect(colors[key]).toBe(colors.sageSoft);
  });
  it('draws cards a lighter ivory than the page so they still stand apart', () => {
    expect(luminance(colors.surface)).toBeGreaterThan(luminance(colors.ground));
  });
  it('draws the keyboard focus ring with at least 3:1 contrast on every page surface', () => {
    for (const background of [colors.ground, colors.surface, colors.sageSoft]) {
      expect(contrast(colors.focus, background)).toBeGreaterThanOrEqual(3);
    }
  });
  it.each([
    ['ink on ground', 'ink', 'ground'], ['ink on surface', 'ink', 'surface'], ['ink on sageSoft', 'ink', 'sageSoft'],
    ['muted on ground', 'muted', 'ground'], ['muted on surface', 'muted', 'surface'], ['muted on sageSoft', 'muted', 'sageSoft'],
    ['onPrimary on primary', 'onPrimary', 'primary'], ['onPrimary on primaryPressed', 'onPrimary', 'primaryPressed'],
    ['primary on sageSoft', 'primary', 'sageSoft'], ['primary on ground', 'primary', 'ground'], ['primary on goodBg', 'primary', 'goodBg'],
    ['onAccent on accent', 'onAccent', 'accent'], ['heroMuted on hero', 'heroMuted', 'hero'],
    ['neutral on neutralBg', 'neutral', 'neutralBg'], ['medium on mediumBg', 'medium', 'mediumBg'], ['low on lowBg', 'low', 'lowBg'],
    ['warning on warningBg', 'warning', 'warningBg'], ['muted on highlightBg', 'muted', 'highlightBg'],
  ] as const)('keeps %s at least 4.5:1', (_, fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(tiers)('keeps the %s tier word at least 4.5:1 on its own tint and on the highlight fill', tier => {
    const tone = tierTone(tier);
    expect(contrast(tone.fg, tone.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.fg, colors.highlightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.fg, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(tiers)('keeps white score-tag text at least 4.5:1 on the %s tier', tier => {
    expect(contrast(colors.onPrimary, tierTone(tier).fg)).toBeGreaterThanOrEqual(4.5);
  });
  it('gives the five tiers five different colours', () => {
    expect(new Set(tiers.map(tier => tierTone(tier).fg)).size).toBe(5);
  });
  it.each(['A', 'B', 'C', 'D', 'E'] as const)('keeps the %s letter at least 4.5:1 selected and unselected', letter => {
    expect(contrast(letterTones.onSelected, letterTones[letter].fg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(letterTones[letter].fg, letterTones[letter].bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps comparison colours readable', () => {
    expect(contrast(comparisonTokens.favorableText, comparisonTokens.favorableBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(comparisonTokens.allergenText, comparisonTokens.allergenBackground)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps the camera panel a deep forest-black, darker than any text colour', () => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(colors.cameraPanel.slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r!);
    expect(g).toBeGreaterThan(b!);
    expect(contrast(colors.cameraInk, colors.cameraPanel)).toBeGreaterThanOrEqual(15);
  });
});

describe('softShadow', () => {
  it('is the one flat-soft shadow: ink, at most 5% opacity, 8 radius, 2 offset, elevation 1', () => {
    expect(softShadow.shadowColor).toBe(light.ink);
    expect(softShadow.shadowOpacity).toBeLessThanOrEqual(0.05);
    expect(softShadow.shadowRadius).toBeLessThanOrEqual(8);
    expect(softShadow.shadowOffset).toEqual({ width: 0, height: 2 });
    expect(softShadow.elevation).toBeLessThanOrEqual(1);
  });
});
