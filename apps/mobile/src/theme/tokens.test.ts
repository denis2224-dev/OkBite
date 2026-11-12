import { dark, light, type Palette } from './tokens';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe.each([['light', light], ['dark', dark]] as [string, Palette][])('%s palette', (_name, colors) => {
  it('draws the keyboard focus ring with at least 3:1 contrast on every page surface', () => {
    for (const background of [colors.ground, colors.surface, colors.soft]) {
      expect(contrast(colors.focus, background)).toBeGreaterThanOrEqual(3);
    }
  });
});
