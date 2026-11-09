import type { HomeTheme } from './home';
export const comparisonTokens = {
  favorableBackground: '#D5E8CE', favorableText: '#173A2A',
  allergenBackground: '#FFF5D9', allergenBorder: '#E8D29A', allergenText: '#5A3D00',
} as const;
export type ComparisonTheme = HomeTheme;
