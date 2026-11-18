import { light, fonts } from './tokens';
export const homeTheme = {
  colors: { ...light, cardBorder: light.border, separator: light.divider },
  fonts: { ...fonts, body: 'DMSans_400Regular', semibold: fonts.medium, extra: 'DMSans_700Bold', headingExtra: fonts.headingExtra },
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
