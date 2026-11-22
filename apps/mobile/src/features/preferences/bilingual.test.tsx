import 'fake-indexeddb/auto';
import { render } from '@testing-library/react-native';
import { clearProfile } from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';
import { AllergenPreferencesScreen } from './AllergenPreferencesScreen';
import { DietaryPreferencesScreen } from './DietaryPreferencesScreen';

jest.mock('../../copy/lang', () => ({ getLanguage: () => 'en' }));
jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));

beforeEach(async () => {
  await clearProfile();
  resetProfileHookState();
});

it('renders the allergen page in English', async () => {
  const screen = await render(<AllergenPreferencesScreen />);
  expect(await screen.findByText('Allergen preferences')).toBeTruthy();
  expect(await screen.findByRole('checkbox', { name: 'Milk' })).toBeTruthy();
});

it('renders the dietary page in English', async () => {
  const screen = await render(<DietaryPreferencesScreen />);
  expect(await screen.findByText('Dietary preferences')).toBeTruthy();
  expect(await screen.findByRole('switch', { name: 'Palm oil' })).toBeTruthy();
});
