import { light, fonts } from './tokens';
export const homeTheme = {
  colors: { ...light, cardBorder: light.border, separator: light.divider },
  fonts: { ...fonts, body: 'Manrope_400Regular', semibold: fonts.medium, extra: 'Manrope_800ExtraBold', headingExtra: 'BricolageGrotesque_800ExtraBold' },
  tiles: [
    { background: '#E8EFE3', foreground: '#35613D' },
    { background: '#F5E8D4', foreground: '#8A5A2C' },
    { background: '#F1E3E1', foreground: '#8C4646' },
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
