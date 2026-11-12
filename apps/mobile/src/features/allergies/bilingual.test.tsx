import 'fake-indexeddb/auto';
import { render } from '@testing-library/react-native';
import { clearProfile } from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';
import { AllergiesScreen } from './AllergiesScreen';

jest.mock('../../copy/lang', () => ({ getLanguage: () => 'en' }));
jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));

beforeEach(async () => {
  await clearProfile();
  resetProfileHookState();
});

it('renders the allergies screen in English when English is selected', async () => {
  const screen = await render(<AllergiesScreen />);
  expect(await screen.findByText('Your allergies')).toBeTruthy();
  expect(screen.getByText('We warn you before the score when a product contains them.', { exact: false })).toBeTruthy();
  expect(screen.getByText('I want to avoid')).toBeTruthy();
  expect(await screen.findByRole('checkbox', { name: 'Milk' })).toBeTruthy();
  expect(screen.getByRole('switch', { name: 'Palm oil' })).toBeTruthy();
});
