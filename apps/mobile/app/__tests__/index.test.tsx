import { renderRouter, screen } from 'expo-router/testing-library';
import Index from '../index';

it('shows the app name on the home route', async () => {
  await renderRouter({ index: Index });
  expect(await screen.findByRole('header', { name: 'OkBite' })).toBeTruthy();
});
