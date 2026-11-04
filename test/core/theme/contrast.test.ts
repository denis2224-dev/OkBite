import { light, dark } from "../../../src/core/theme/colors";
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
it.each([
  ["light", light],
  ["dark", dark],
] as const)(
  "%s semantic text pairs meet contrast requirements",
  (_name, colors) => {
    const pairs = [
      ["ink", "ground"],
      ["muted", "ground"],
      ["ink", "surface"],
      ["muted", "surface"],
      ["onPrimary", "primary"],
      ["onAccent", "accent"],
      ["good", "goodBg"],
      ["medium", "mediumBg"],
      ["low", "lowBg"],
      ["neutral", "neutralBg"],
      ["heroText", "hero"],
      ["heroMuted", "hero"],
    ] as const;
    for (const [fg, bg] of pairs) {
      const a = luminance(colors[fg]),
        b = luminance(colors[bg]);
      expect(
        { fg, bg, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
          .ratio,
      ).toBeGreaterThanOrEqual(4.5);
    }
  },
);
