import 'fake-indexeddb/auto';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ro } from '../../copy/ro';
import { light, radii } from '../../theme/tokens';
import * as store from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';
import { OnboardingScreen } from './OnboardingScreen';

jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const flat = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

beforeEach(async () => {
  await store.clearProfile();
  resetProfileHookState();
  await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
});

it('draws skip as a ghost button with a forest label', () => {
  expect(flat(ro.onboarding.skip).backgroundColor).toBe(light.transparent);
  expect(screen.getByText(ro.onboarding.skip)).toHaveStyle({ color: light.primary });
});

it('draws the footer action as the flat forest pill', () => {
  expect(flat(ro.onboarding.continue)).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill });
  expect(flat(ro.onboarding.continue).shadowOpacity).toBeUndefined();
});

it('uses the shared icon button for back from step 2 on', async () => {
  expect(screen.queryByRole('button', { name: ro.app.back })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  const back = screen.getByRole('button', { name: ro.app.back });
  expect(within(back).getByTestId('icon-button-face')).toBeTruthy();
});
