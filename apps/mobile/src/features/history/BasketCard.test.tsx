import { AccessibilityInfo, Animated } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { BasketCard } from './BasketCard';
import type { Basket } from './basket';
import { ro } from '../../copy/ro';
import { StyleSheet } from 'react-native';
import { fonts, light, shadows } from '../../theme/tokens';

const basket: Basket = { average: 69, tier: 'good', scored: 5, unscored: 1,
  mix: { excellent: 1, good: 3, fair: 1, poor: 0, bad: 0 }, best: { name: 'Iaurt natural 2,5%', score: 86, tier: 'excellent' } };
afterEach(() => jest.restoreAllMocks());

it('shows the average badge, the tier bar and the best find, with no heading, legend or captions', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<BasketCard basket={basket} />);
  expect(screen.queryByRole('header')).toBeNull();
  expect(StyleSheet.flatten(screen.getByTestId('basket-card').props.style)).toMatchObject({ backgroundColor: light.surface, boxShadow: shadows.raised });
  const badge = screen.getByLabelText(`${ro.history.score(69)} · ${ro.tiers.good}. ${ro.history.basket.average(5)}`);
  expect(badge).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('basket-score-box', { includeHiddenElements: true }).props.style).backgroundColor).toBe(light.primary);
  for (const text of [ro.history.basket.title, ro.history.basket.average(5), ro.history.basket.count(1, ro.tiers.excellent), ro.history.basket.unscored(1), `${ro.history.score(86)} · ${ro.tiers.excellent}`]) {
    expect(screen.queryByText(text)).toBeNull();
  }
  expect(StyleSheet.flatten(screen.getByText(ro.history.basket.best('Iaurt natural 2,5%')).props.style)).toMatchObject({ fontSize: 15, fontFamily: fonts.bold });
  expect(screen.getByLabelText(ro.history.basket.mixLabel(basket.mix))).toBeTruthy();
});

it('shows the final average straight away when the phone asks for reduced motion', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<BasketCard basket={basket} />);
  expect(screen.getAllByText('69', { includeHiddenElements: true }).length).toBeGreaterThan(0);
});

it('shows the average straight away and keeps the text still; only the tag swings in', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  await render(<BasketCard basket={basket} />);
  expect(screen.getAllByText('69', { includeHiddenElements: true }).length).toBeGreaterThan(0); // no count-up from 0
  expect(screen.queryByText('0', { includeHiddenElements: true })).toBeNull();
  await waitFor(() => expect(timing).toHaveBeenCalledTimes(1)); // the tag's own swing, as on the product page
  expect(screen.getAllByText('69', { includeHiddenElements: true }).length).toBeGreaterThan(0);
});

it('colours the tier bar with the CALM grade fills: Excelent primary, Bun light green, Mediu sand', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<BasketCard basket={basket} />);
  const colours = ['excellent', 'good', 'fair'].map(t => StyleSheet.flatten(screen.getByTestId(`seg-${t}`, { includeHiddenElements: true }).props.style).backgroundColor);
  expect(colours).toEqual([light.primary, light.greenLight, light.sand]);
});
