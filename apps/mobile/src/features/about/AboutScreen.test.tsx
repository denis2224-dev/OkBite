import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AboutScreen } from './AboutScreen';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
it('has exactly three blocks, the disclaimer once and no duplicate sources heading', async () => {
  await render(<AboutScreen />);
  expect(screen.getAllByRole('header').map(h => h.props.children)).toEqual([ro.about.title, ro.about.whatTitle, ro.about.scoreTitle, ro.about.promiseTitle]);
  for (const text of [ro.about.whatBody, ro.about.promiseBody]) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getAllByText(ro.score.disclaimer)).toHaveLength(1);
  expect(screen.queryByText('Sursele noastre')).toBeNull();
  expect(screen.getAllByRole('button').map(b => b.props.accessibilityLabel)).toEqual(expect.arrayContaining([ro.settings.method, ro.about.sources, ro.nav.privacy, ro.nav.terms]));
  for (const tier of ['excellent', 'good', 'fair', 'poor', 'bad'] as const) expect(screen.getByText(ro.tiers[tier])).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.method }));
  expect(router.push).toHaveBeenCalledWith('/method');
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.privacy }));
  expect(router.push).toHaveBeenCalledWith('/privacy');
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.terms }));
  expect(router.push).toHaveBeenCalledWith('/terms');
});
it('opens the existing public data source and preserves a failure message', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  await render(<AboutScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.about.sources }));
  expect(open).toHaveBeenCalledWith('https://world.openfoodfacts.org');
  expect(screen.getByText(ro.app.retry)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.about.sources }));
  expect(screen.queryByText(ro.app.retry)).toBeNull();
  open.mockRestore();
});
it('goes back to Profile from the header back button', async () => {
  await render(<AboutScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.app.back }));
  expect(router.back).toHaveBeenCalledTimes(1);
});
it('keeps the forest feature card flat and draws each tier swatch in its tier tone', async () => {
  await render(<AboutScreen />);
  const feature = StyleSheet.flatten(screen.getByTestId('about-feature').props.style);
  expect(feature).toMatchObject({ backgroundColor: light.hero, borderColor: light.hero });
  for (const key of ['shadowOpacity', 'elevation', 'boxShadow', 'experimental_backgroundImage']) expect(feature[key as keyof typeof feature]).toBeUndefined();
  for (const tier of ['excellent', 'good', 'fair', 'poor', 'bad'] as const) {
    expect(StyleSheet.flatten(screen.getByTestId(`tier-swatch-${tier}`).props.style)).toMatchObject({ backgroundColor: tierTone(tier).fg });
  }
});
