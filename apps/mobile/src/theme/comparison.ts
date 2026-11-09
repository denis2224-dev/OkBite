import type { HomeTheme } from './home';
import { light } from './tokens';
export const comparisonTokens = {
  favorableBackground: light.goodBg, favorableText: light.good,
  allergenBackground: light.warningBg, allergenBorder: light.border, allergenText: light.warning,
} as const;
export type ComparisonTheme = HomeTheme;
