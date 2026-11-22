import { light, fonts } from './tokens';
export const homeTheme = {
  colors: { ...light, cardBorder: light.border, separator: light.divider },
  fonts: { ...fonts, body: fonts.body, semibold: fonts.bold, extra: fonts.bold, headingExtra: fonts.headingExtra },
  tiles: [
    { background: light.mist, foreground: light.primaryDark },
    { background: light.successBg, foreground: light.primaryDark },
    { background: light.chipSelectedBg, foreground: light.primaryDark },
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
