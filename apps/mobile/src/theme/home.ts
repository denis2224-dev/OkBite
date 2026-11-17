import { light, fonts } from './tokens';
export const homeTheme = {
  colors: { ...light, cardBorder: light.border, separator: light.divider },
  fonts: { ...fonts, body: 'Manrope_400Regular', semibold: fonts.medium, extra: 'Manrope_800ExtraBold', headingExtra: 'BricolageGrotesque_800ExtraBold' },
  tiles: [
    { background: light.goodBg, foreground: light.primary },
    { background: light.mediumBg, foreground: light.medium },
    { background: light.lowBg, foreground: light.low },
  ],
} as const;

export type HomeTheme = {
  colors: { [K in keyof typeof homeTheme.colors]: string };
  fonts: typeof homeTheme.fonts;
  tiles: readonly { background: string; foreground: string }[];
};
/** Light only. */
export function useHomeTheme(): HomeTheme {
  return homeTheme;
}
