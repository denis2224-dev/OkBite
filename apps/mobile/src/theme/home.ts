import { light, dark, fonts } from './tokens';
import { useTheme } from './useTheme';
export const homeTheme = {
  colors: { ...light, cardBorder: light.border, separator: light.divider },
  fonts: { ...fonts, body: 'Manrope_400Regular', semibold: fonts.medium, extra: 'Manrope_800ExtraBold', headingExtra: 'BricolageGrotesque_800ExtraBold' },
  tiles: [
    { background: light.soft, foreground: light.ink },
  ],
} as const;

export type HomeTheme = {
  colors: { [K in keyof typeof homeTheme.colors]: string };
  fonts: typeof homeTheme.fonts;
  tiles: readonly { background: string; foreground: string }[];
};
const darkHomeTheme: HomeTheme = {
  ...homeTheme,
  colors: { ...homeTheme.colors, ...dark, cardBorder: dark.border, separator: dark.divider },
  tiles: [
    { background: dark.soft, foreground: dark.ink },
  ],
};
export function useHomeTheme(): HomeTheme {
  return useTheme().isDark ? darkHomeTheme : homeTheme;
}
