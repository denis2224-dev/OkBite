import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { ProfileLinks } from './ProfileLinks';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

it('lists Alergiile mele, Setări and Despre as settings rows with mist tiles, and opens each', async () => {
  await render(<ProfileLinks />);
  expect(screen.getAllByTestId('settings-tile', { includeHiddenElements: true })).toHaveLength(3);
  await fireEvent.press(screen.getByRole('button', { name: ro.profile.myAllergies }));
  expect(router.push).toHaveBeenCalledWith('/preferences/allergens'); // straight to the page: a redirect showed an empty screen first
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.settings }));
  expect(router.push).toHaveBeenCalledWith('/settings');
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.about }));
  expect(router.push).toHaveBeenCalledWith('/about');
});
