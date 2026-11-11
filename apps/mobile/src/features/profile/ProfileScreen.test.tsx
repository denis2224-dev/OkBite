import 'fake-indexeddb/auto';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { Profile } from '@okbite/shared';
import type { GestureResponderEvent } from 'react-native';
import { ro } from '../../copy/ro';
import * as pressable from '../../shared/PressableOpacity';
import { ProfileScreen } from './ProfileScreen';
import * as store from './store';
import { resetProfileHookState, useProfile } from './useProfile';

jest.mock('./db', () => jest.requireActual('./db.web'));

const existing: Profile = { goals: ['weight'], allergens: ['Soia'], avoid: ['sweeteners'], onboarded: true };
const failure = new Error('Storage failure');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function capturePress(firstLabel: string, ...otherLabels: string[]) {
  const Original = pressable.PressableOpacity;
  const labels = [firstLabel, ...otherLabels];
  const handlers = new Map<string, () => unknown>();
  jest.spyOn(pressable, 'PressableOpacity').mockImplementation((props) => {
    const label = props.accessibilityLabel;
    if (label && labels.includes(label) && !props.disabled) {
      handlers.set(label, () => props.onPress?.({} as GestureResponderEvent));
    }
    return <Original {...props} />;
  });
  return (label = firstLabel) => {
    const handler = handlers.get(label);
    if (!handler) throw new Error('Enabled control not rendered: ' + label);
    return handler();
  };
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await store.clearProfile();
  resetProfileHookState();
});

it('shows the local privacy note and persists choices from all three groups', async () => {
  await store.saveProfile(existing);
  const labels = [ro.profile.health, ro.allergens.Lapte, ro.profile.added_sugar] as const;
  const press = capturePress(...labels);
  const screen = await render(<ProfileScreen />);
  for (const text of [ro.profile.title, ro.profile.savedLocally, ro.profile.goalTitle,
    ro.profile.allergensTitle, ro.profile.avoidTitle]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  for (const name of labels) {
    await screen.findByRole('checkbox', { name, disabled: false });
    await act(async () => { await press(name); });
  }
  expect(await store.loadProfile()).toEqual({
    goals: ['weight', 'health'], allergens: ['Soia', 'Lapte'],
    avoid: ['sweeteners', 'added_sugar'], onboarded: true,
  });
});

it('recovers on the same mounted screen after a failed hydration retry', async () => {
  const retry = deferred<Profile>();
  const load = jest.spyOn(store, 'loadProfile').mockRejectedValueOnce(failure)
    .mockReturnValueOnce(retry.promise).mockResolvedValueOnce(existing);
  const pressRetry = capturePress(ro.errors.retry);
  const screen = await render(<ProfileScreen />);
  await screen.findByText(ro.errors.generic);
  let pending: unknown;
  await act(async () => { pending = pressRetry(); await pressRetry(); });
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: ro.errors.retry }).props.accessibilityState.disabled).toBe(true);
  await act(async () => { retry.reject(failure); await pending; });
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
  expect(load).toHaveBeenCalledTimes(3);
  expect(screen.queryByText(ro.errors.generic)).toBeNull();
  expect(screen.getByRole('checkbox', { name: ro.profile.weight }).props.accessibilityState.checked).toBe(true);
});

it('blocks changes during hydration and only accepts one edit during a pending save', async () => {
  const read = deferred<Profile>();
  const write = deferred<Profile>();
  jest.spyOn(store, 'loadProfile').mockReturnValueOnce(read.promise);
  const save = jest.spyOn(store, 'saveProfile').mockReturnValueOnce(write.promise);
  const pressHealth = capturePress(ro.profile.health);
  const screen = await render(<ProfileScreen />);
  const chip = (name: string) => screen.getByRole('checkbox', { name });
  expect(chip(ro.profile.health).props.accessibilityState.disabled).toBe(true);
  await act(async () => { read.resolve(existing); });
  expect(chip(ro.profile.health).props.accessibilityState.disabled).toBe(false);
  let pending: unknown;
  await act(async () => { pending = pressHealth(); await pressHealth(); });
  expect(chip(ro.profile.weight).props.accessibilityState.disabled).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { write.resolve({ ...existing, goals: ['weight', 'health'] }); await pending; });
  expect(chip(ro.profile.health).props.accessibilityState.checked).toBe(true);
  expect(chip(ro.profile.weight).props.accessibilityState.disabled).toBe(false);
});

it.each(['Retry', 'choice'] as const)('recovers from a failed preference write via %s', async (action) => {
  await store.saveProfile(existing);
  const save = jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(failure);
  const press = capturePress(ro.profile.health, ro.errors.retry);
  const screen = await render(<ProfileScreen />);
  await screen.findByRole('checkbox', { name: ro.profile.health, disabled: false });
  await act(async () => { await press(ro.profile.health); });
  expect(await store.loadProfile()).toEqual(existing);
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.errors.retry })).toBeTruthy();
  await act(async () => { await press(action === 'Retry' ? ro.errors.retry : ro.profile.health); });
  expect(save).toHaveBeenCalledTimes(2);
  expect(await store.loadProfile()).toEqual({ ...existing, goals: ['weight', 'health'] });
  expect(screen.queryByText(ro.errors.generic)).toBeNull();
});

it('retries a failed allergen edit without overwriting a newer onboarding reset', async () => {
  await store.saveProfile(existing);
  const press = capturePress(ro.allergens.Lapte, ro.errors.retry);
  let other!: ReturnType<typeof useProfile>;
  function SecondConsumer() {
    other = useProfile();
    return null;
  }
  const screen = await render(<><ProfileScreen /><SecondConsumer /></>);
  await screen.findByRole('checkbox', { name: ro.allergens.Lapte, disabled: false });
  jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(failure);
  await act(async () => { await press(ro.allergens.Lapte); });
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  await act(async () => { await other.resetOnboarding(); });
  expect((await store.loadProfile()).onboarded).toBe(false);
  await act(async () => { await press(ro.errors.retry); });
  expect(await store.loadProfile()).toEqual({
    ...existing, allergens: ['Soia', 'Lapte'], onboarded: false,
  });
});
