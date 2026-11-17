import 'fake-indexeddb/auto';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { Profile } from '@okbite/shared';
import type { GestureResponderEvent } from 'react-native';
import { ro } from '../../copy/ro';
import * as pressable from '../../shared/PressableOpacity';
import * as store from '../profile/store';
import { resetProfileHookState, useProfile } from '../profile/useProfile';
import { OnboardingScreen } from './OnboardingScreen';

jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

const existing: Profile = { goals: ['allergies'], allergens: ['Lapte'], avoid: ['added_sugar'], onboarded: false };
const failure = new Error('Storage failure');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Capture the same handler to exercise repeated events before React renders disabled state.
function capturePress(label: string) {
  const Original = pressable.PressableOpacity;
  let handler: (() => unknown) | undefined;
  jest.spyOn(pressable, 'PressableOpacity').mockImplementation((props) => {
    if (props.accessibilityLabel === label && !props.disabled) {
      handler = () => props.onPress?.({} as GestureResponderEvent);
    }
    return <Original {...props} />;
  });
  return () => {
    if (!handler) throw new Error('Enabled control not rendered: ' + label);
    return handler();
  };
}

beforeEach(async () => {
  jest.restoreAllMocks();
  mockReplace.mockClear();
  await store.clearProfile();
  resetProfileHookState();
});

it('starts at language selection, calls setLanguage when switching, and skips reload for the current language', async () => {
  const setLanguage = jest.fn();
  const screen = await render(<OnboardingScreen currentLanguage="ro" setLanguage={setLanguage} />);
  expect(await screen.findByText(ro.settings.romanian)).toBeTruthy();
  expect(screen.getByText(ro.onboarding.step(1))).toBeTruthy();
  expect(screen.getByText(ro.onboarding.languageTitle)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.settings.romanian }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.romanian }));
  expect(setLanguage).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.russian }));
  expect(setLanguage).toHaveBeenCalledWith('ru');
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.english }));
  expect(setLanguage).toHaveBeenCalledWith('en');
});

it('shows an error without leaving step 1 if saving the language choice throws', async () => {
  const setLanguage = jest.fn(() => { throw new Error('blocked'); });
  const screen = await render(<OnboardingScreen currentLanguage="ro" setLanguage={setLanguage} />);
  await fireEvent.press(await screen.findByRole('button', { name: ro.settings.russian }));
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  expect(screen.getByText(ro.onboarding.step(1))).toBeTruthy();
});

it('moves forward and back through all four onboarding steps', async () => {
  const screen = await render(<OnboardingScreen />);
  expect(await screen.findByText(ro.settings.romanian)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.getByText(ro.onboarding.step(2))).toBeTruthy();
  await fireEvent.press(screen.getByText(ro.profile.health));
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.getByText(ro.onboarding.step(3))).toBeTruthy();
  expect(screen.getByText(ro.onboarding.allergensTitle)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.back }));
  expect(screen.getByText(ro.onboarding.step(2))).toBeTruthy();
});

it('shows no saved-locally note on any step, and the finish button on the last', async () => {
  const savedLocally = 'Preferințele sunt salvate doar pe acest telefon.';
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
  expect(screen.queryByText(savedLocally)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.queryByText(savedLocally)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.queryByText(savedLocally)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.queryByText(savedLocally)).toBeNull();
  expect(screen.getByRole('button', { name: ro.onboarding.done })).toBeTruthy();
});

it('saves choices from all preference steps before opening Scan', async () => {
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  await fireEvent.press(screen.getByText(ro.profile.health));
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  await fireEvent.press(screen.getByText(ro.allergens.Gluten));
  await fireEvent.press(screen.getByText(ro.allergens.Lapte));
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.getByText(ro.onboarding.step(4))).toBeTruthy();
  await fireEvent.press(screen.getByText(ro.profile.palm_oil));
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.done }));
  expect(await store.loadProfile()).toEqual({
    goals: ['health'], allergens: ['Gluten', 'Lapte'], avoid: ['palm_oil'], onboarded: true,
  });
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('persists the current selection when skipping', async () => {
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  await fireEvent.press(screen.getByText(ro.profile.family));
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.skip }));
  expect(await store.loadProfile()).toMatchObject({ goals: ['family'], onboarded: true });
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('preserves newer edits from another profile consumer when finishing', async () => {
  await store.saveProfile(existing);
  const skip = capturePress(ro.onboarding.skip);
  let updateProfile!: ReturnType<typeof useProfile>['setProfile'];
  function OtherConsumer() {
    updateProfile = useProfile().setProfile;
    return null;
  }
  const screen = await render(<><OnboardingScreen /><OtherConsumer /></>);
  await screen.findByText(ro.settings.romanian);
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  await fireEvent.press(screen.getByRole('checkbox', { name: ro.profile.health }));
  await fireEvent.press(screen.getByRole('checkbox', { name: ro.profile.allergies }));
  await act(async () => {
    const competing = updateProfile((profile) => ({
      ...profile, goals: ['allergies', 'family'], allergens: ['Soia'],
    }));
    await Promise.all([competing, skip()]);
  });
  expect(await store.loadProfile()).toEqual({
    ...existing, goals: ['family', 'health'], allergens: ['Soia'], onboarded: true,
  });
});

it('disables Skip and Continue during hydration and preserves loaded preferences on Skip', async () => {
  const read = deferred<Profile>();
  jest.spyOn(store, 'loadProfile').mockReturnValueOnce(read.promise);
  const screen = await render(<OnboardingScreen />);
  for (const name of [ro.onboarding.skip, ro.onboarding.continue]) {
    expect(screen.getByRole('button', { name }).props.accessibilityState.disabled).toBe(true);
  }
  await act(async () => { read.resolve(existing); });
  expect(screen.getByRole('button', { name: ro.onboarding.continue }).props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.skip }));
  expect(await store.loadProfile()).toEqual({ ...existing, onboarded: true });
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('handles another failed read, deduplicates Retry, and recovers on the same screen', async () => {
  const retry = deferred<Profile>();
  const load = jest.spyOn(store, 'loadProfile').mockRejectedValueOnce(failure)
    .mockReturnValueOnce(retry.promise).mockResolvedValueOnce(existing);
  const pressRetry = capturePress(ro.errors.retry);
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.errors.generic);
  expect(screen.getByRole('button', { name: ro.onboarding.skip }).props.accessibilityState.disabled).toBe(true);
  let pending: unknown;
  await act(async () => { pending = pressRetry(); await pressRetry(); });
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: ro.errors.retry }).props.accessibilityState.disabled).toBe(true);
  await act(async () => { retry.reject(failure); await pending; });
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
  expect(load).toHaveBeenCalledTimes(3);
  expect(screen.queryByText(ro.errors.generic)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  expect(screen.getByRole('checkbox', { name: ro.profile.allergies }).props.accessibilityState.checked).toBe(true);
});

it('retains choices after a failed save and opens Scan only after a successful retry', async () => {
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
  await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
  await fireEvent.press(screen.getByText(ro.profile.health));
  jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(failure);
  const skip = () => screen.getByRole('button', { name: ro.onboarding.skip });
  await fireEvent.press(skip());
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: ro.profile.health }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(skip());
  expect(await store.loadProfile()).toMatchObject({ goals: ['health'], onboarded: true });
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('accepts only one completion when Skip is pressed twice in the same render', async () => {
  const save = jest.spyOn(store, 'saveProfile');
  const skip = capturePress(ro.onboarding.skip);
  const screen = await render(<OnboardingScreen />);
  await screen.findByText(ro.settings.romanian);
  await act(async () => { await Promise.all([skip(), skip()]); });
  expect(save).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(await store.loadProfile()).toMatchObject({ onboarded: true });
});
