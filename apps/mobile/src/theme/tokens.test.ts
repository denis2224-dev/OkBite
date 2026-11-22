import { light, radii, shadows, spacing } from './tokens';
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

describe('CALM / KIT palette', () => {
  const colors = light;
  it('uses the spec colours for the base, text and brand tokens', () => {
    expect(colors).toMatchObject({
      ground: '#F4EFE8', surface: '#F7F3EE', ink: '#2B2B28', textSecondary: '#55524C', muted: '#6F6A63',
      primary: '#4A7055', primaryDark: '#355C40', accent: '#5E8C68', greenLight: '#A3C4A4', mist: '#D3E6D4',
      successBg: '#DFEDE0', chipSelectedBg: '#E6F0E6', sand: '#D4BFA6', divider: '#E6DFD5', track: '#E3DCD2',
      switchOff: '#DDD6CC', checkboxBorder: '#8F877C', dangerBg: '#F5DFCF', dangerText: '#8A4E3A', cameraBg: '#2F3E33',
    });
  });
  it('draws the keyboard focus ring with at least 3:1 contrast on the page and cards', () => {
    for (const background of [colors.ground, colors.surface]) expect(contrast(colors.focus, background)).toBeGreaterThanOrEqual(3);
  });
  it.each([
    ['ink', 'ground'], ['ink', 'surface'], ['ink', 'chipSelectedBg'], ['ink', 'track'], ['ink', 'greenLight'], ['ink', 'sand'],
    ['textSecondary', 'ground'], ['textSecondary', 'surface'], ['textSecondary', 'track'],
    ['muted', 'ground'], ['muted', 'surface'],
    ['primary', 'ground'], ['primary', 'surface'], ['primaryDark', 'successBg'], ['primaryDark', 'mist'],
    ['dangerText', 'dangerBg'], ['dangerText', 'ground'], ['onPrimary', 'primary'], ['cameraInk', 'cameraBg'],
    ['warning', 'warningBg'], ['neutral', 'neutralBg'], ['good', 'goodBg'], ['low', 'lowBg'], ['medium', 'mediumBg'],
  ] as const)('keeps %s text on %s at least 4.5:1', (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['A', 'B', 'C', 'D', 'E'] as const)('keeps the letter at least 4.5:1 on the selected %s segment', letter => {
    expect(contrast(letterTones.onSelected, letterTones[letter].fg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['excellent', 'good', 'fair', 'poor', 'bad'] as const)('keeps the %s tier text readable on its fill and its word readable on the page', tier => {
    const tone = tierTone(tier);
    expect(contrast(tone.onFill, tone.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.word, colors.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.word, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('CALM / KIT shape tokens', () => {
  it('defines the soft shadows as boxShadow strings, with no white highlight', () => {
    for (const value of Object.values(shadows)) expect(value).not.toMatch(/#FFF/i);
    expect(shadows).toEqual({
      raised: '6px 6px 16px rgba(120,105,85,0.14)',
      raisedSm: '3px 3px 8px rgba(120,105,85,0.14)',
      nav: '6px 6px 18px rgba(120,105,85,0.20)',
      primaryGlow: '0px 8px 16px rgba(74,112,85,0.30)',
      inset: 'inset 2px 2px 4px rgba(120,105,85,0.18)',
    });
  });
  it('defines the spec radii and spacing', () => {
    expect(radii).toMatchObject({ card: 24, cardSm: 22, pill: 999, badge: 20, listBadge: 14, tile: 14, image: 20, nav: 30, segment: 18, segmentTab: 14 });
    expect(spacing).toMatchObject({ screenX: 22, screenTop: 32, section: 20, cardPad: 20, navClearance: 130 });
  });
});
