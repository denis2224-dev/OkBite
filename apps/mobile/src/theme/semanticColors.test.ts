import { light, dark } from './tokens';

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(part => parseInt(part, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

describe.each([['light', light], ['dark', dark]] as const)('%s semantic colors', (_mode, colors) => {
  it('keeps text readable on its actual surfaces, including alerts and controls', () => {
    const pairs = [
      [colors.ink, colors.ground], [colors.ink, colors.surface], [colors.ink, colors.soft],
      [colors.muted, colors.ground], [colors.muted, colors.surface],
      [colors.onPrimary, colors.primary], [colors.onAccent, colors.accent],
      [colors.heroText, colors.hero], [colors.heroMuted, colors.hero],
      [colors.good, colors.goodBg], [colors.medium, colors.mediumBg], [colors.low, colors.lowBg],
      [colors.neutral, colors.neutralBg], [colors.error, colors.errorBg], [colors.info, colors.infoBg],
      [colors.disabledText, colors.disabledBg], [colors.onPrimary, colors.primaryHover], [colors.onPrimary, colors.primaryPressed],
    ];
    for (const [foreground, background] of pairs) expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps control boundaries and focus indicators distinct from neutral surfaces', () => {
    for (const surface of [colors.ground, colors.surface, colors.soft]) {
      expect(contrast(colors.controlBorder, surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.focus, surface)).toBeGreaterThanOrEqual(3);
    }
  });
  it('separates critical errors from nutrition and reuses good/moderate roles for success/warnings', () => {
    expect(colors.error).not.toBe(colors.low);
    expect(colors.errorBg).not.toBe(colors.lowBg);
    expect([colors.success, colors.successBg]).toEqual([colors.good, colors.goodBg]);
    expect([colors.warning, colors.warningBg]).toEqual([colors.medium, colors.mediumBg]);
  });
});
