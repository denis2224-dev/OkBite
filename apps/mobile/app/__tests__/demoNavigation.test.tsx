import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import Home from '../(tabs)/index';

jest.mock('../../src/lib/preview', () => ({ isPreview: true }));
const Blank = () => null;

// Demo mode used to push '/preview', a route that does not exist in apps/mobile ("Unmatched Route").
it.each([
  ['Fotografiază eticheta', '/capture'],
  ['Scanează produsul', '/scan'],
])('in demo mode "%s" opens %s', async (name, path) => {
  await renderRouter({ index: Home, capture: Blank, scan: Blank });
  const button = await screen.findByRole('button', { name });
  await act(async () => { fireEvent.press(button); });
  expect(screen).toHavePathname(path);
});
