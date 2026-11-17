import type { HomeTheme } from './home';
import { light } from './tokens';
export const comparisonTokens = {
  favorableBackground: light.favorableBg, favorableText: light.favorable,
  allergenBackground: light.warningBg, allergenBorder: light.warningBorder, allergenText: light.warning,
} as const;
export type ComparisonTheme = HomeTheme;
