import { renderRouter, screen } from 'expo-router/testing-library';
import Home from '../(tabs)/index';

it('shows the photo button and the scan link on the home route', async () => {
  await renderRouter({ index: Home });
  expect(await screen.findByRole('button', { name: 'Fotografiază produsul' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Scanează codul de bare' })).toBeTruthy();
});
