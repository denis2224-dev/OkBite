import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { AboutScreen } from './AboutScreen';
import { ro } from '../../copy/ro';
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
it('explains all sections, missing data and allergy limits without the official logo', async () => {
  await render(<AboutScreen />);
  for (const text of [ro.about.whatBody, ro.about.methodBody, ro.about.tiersBody, ro.about.nutriScoreBody, ro.about.sourcesBody, ro.about.promiseBody, ro.score.disclaimer]) expect(screen.getByText(text)).toBeTruthy();
  for (const tier of ['excellent', 'good', 'fair', 'poor', 'bad'] as const) expect(screen.getByText(ro.tiers[tier])).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.method }));
  expect(router.push).toHaveBeenCalledWith('/method');
});
it('opens the existing public data source and preserves a failure message', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  await render(<AboutScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.about.sourcesTitle }));
  expect(open).toHaveBeenCalledWith('https://world.openfoodfacts.org');
  expect(screen.getByText(ro.app.retry)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.about.sourcesTitle }));
  expect(screen.queryByText(ro.app.retry)).toBeNull();
  open.mockRestore();
});
