import 'fake-indexeddb/auto';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Profile } from '@okbite/shared';
import type { GestureResponderEvent } from 'react-native';
import { ro } from '../../copy/ro';
import * as pressable from '../../shared/PressableOpacity';
import { ProfileScreen } from './ProfileScreen';
import * as store from './store';
import { resetProfileHookState, useProfile } from './useProfile';

jest.mock('./db', () => jest.requireActual('./db.web'));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

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

it('shows no "saved on this phone" line, edits goals only and persists them', async () => {
  await store.saveProfile(existing);
  const labels = [ro.profile.health, ro.profile.family] as const;
  const press = capturePress(...labels);
  const screen = await render(<ProfileScreen />);
  for (const text of [ro.profile.title, ro.profile.goalTitle]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.queryByText('Salvat doar pe acest telefon')).toBeNull();
  // Allergens and avoid keys moved to the Allergies tab, so they are edited in one place.
  for (const text of [ro.profile.allergensTitle, ro.profile.avoidTitle, ro.allergens.Lapte, ro.profile.palm_oil]) {
    expect(screen.queryByText(text)).toBeNull();
  }
  for (const name of labels) {
    await screen.findByRole('checkbox', { name, disabled: false });
    await act(async () => { await press(name); });
  }
  expect(await store.loadProfile()).toEqual({ ...existing, goals: ['weight', 'health', 'family'] });
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

it('retries a failed goal edit without overwriting a newer onboarding reset', async () => {
  await store.saveProfile(existing);
  const press = capturePress(ro.profile.health, ro.errors.retry);
  let other!: ReturnType<typeof useProfile>;
  function SecondConsumer() {
    other = useProfile();
    return null;
  }
  const screen = await render(<><ProfileScreen /><SecondConsumer /></>);
  await screen.findByRole('checkbox', { name: ro.profile.health, disabled: false });
  jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(failure);
  await act(async () => { await press(ro.profile.health); });
  expect(screen.getByText(ro.errors.generic)).toBeTruthy();
  await act(async () => { await other.resetOnboarding(); });
  expect((await store.loadProfile()).onboarded).toBe(false);
  await act(async () => { await press(ro.errors.retry); });
  expect(await store.loadProfile()).toEqual({
    ...existing, goals: ['weight', 'health'], onboarded: false,
  });
});

describe('preference cards', () => {
  const chosen: Profile = { goals: [], allergens: ['Lapte', 'Gluten'], avoid: ['palm_oil'], onboarded: true };
  async function ready() {
    await store.saveProfile(chosen);
    const screen = await render(<ProfileScreen />);
    await screen.findByText(ro.allergens.Lapte);
    return screen;
  }
  it('shows the chosen dietary and allergen preferences as read-only chips, and no counts', async () => {
    const screen = await ready();
    const dietary = screen.getByTestId('pref-dietary');
    const allergens = screen.getByTestId('pref-allergens');
    expect(within(dietary).getByText(ro.allergies.dietaryTitle)).toBeTruthy();
    expect(within(dietary).getByText(ro.profile.palm_oil)).toBeTruthy();
    expect(within(dietary).queryByText(ro.profile.sweeteners)).toBeNull(); // not chosen
    expect(within(allergens).getByText(ro.allergies.allergenPrefsTitle)).toBeTruthy();
    for (const name of [ro.allergens.Lapte, ro.allergens.Gluten]) expect(within(allergens).getByText(name)).toBeTruthy();
    expect(screen.queryByText(/selected|selectat|выбран/i)).toBeNull();
    expect(within(allergens).queryAllByRole('checkbox')).toHaveLength(0); // chips here only show; they are edited on their page
  });
  it('has an Edit text link, with no background, far from the title, that opens the matching page', async () => {
    const screen = await ready();
    for (const [id, title, path] of [['pref-dietary', ro.allergies.dietaryTitle, '/preferences/dietary'], ['pref-allergens', ro.allergies.allergenPrefsTitle, '/preferences/allergens']] as const) {
      const card = screen.getByTestId(id);
      const edit = within(card).getByRole('button', { name: `${ro.profile.edit}: ${title}` });
      const text = within(edit).getByText(ro.profile.edit);
      const textStyle = StyleSheet.flatten(text.props.style);
      expect(textStyle.fontSize).toBeLessThanOrEqual(13);
      const editStyle = StyleSheet.flatten(edit.props.style);
      expect(editStyle.backgroundColor).toBeUndefined();
      expect(editStyle.borderWidth).toBeUndefined();
      expect(editStyle.minHeight).toBeGreaterThanOrEqual(44);
      expect(edit.props.hitSlop).toBeTruthy();
      const header = StyleSheet.flatten(within(card).getByTestId(`${id}-header`).props.style);
      expect(header).toMatchObject({ justifyContent: 'space-between' });
      expect(header.gap).toBeGreaterThanOrEqual(24);
      await fireEvent.press(edit);
      expect(router.push).toHaveBeenLastCalledWith(path);
    }
  });
  it('shows only the header row when nothing is chosen', async () => {
    await store.saveProfile({ goals: [], allergens: [], avoid: [], onboarded: true });
    const screen = await render(<ProfileScreen />);
    await screen.findByTestId('pref-allergens');
    expect(within(screen.getByTestId('pref-allergens')).queryByTestId('pref-allergens-chips')).toBeNull();
    expect(within(screen.getByTestId('pref-allergens')).getByText(ro.profile.edit)).toBeTruthy();
  });
});
