import { renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent } from '@testing-library/react-native';
import { ro } from '../../src/copy/ro';
import Home from '../(tabs)/index';

it('shows the photo button and the scan link on the home route', async () => {
  await renderRouter({ index: Home });
  expect(await screen.findByRole('button', { name: 'Fotografiază eticheta' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Scanează produsul' })).toBeTruthy();
});

it.each(['about', 'method', 'privacy', 'terms'] as const)('keeps %s reachable from Home settings', async (path) => {
  await renderRouter({ index: Home, [path]: () => null });
  await fireEvent.press(screen.getByRole('button', { name: ro.home.design.demo }));
  await fireEvent.press(screen.getByRole('button', { name: ro.nav[path] }));
  expect(screen).toHavePathname(`/${path}`);
});
