import 'fake-indexeddb/auto';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ALLERGENS, type Profile } from '@okbite/shared';
import { StyleSheet } from 'react-native';
import { ro } from '../../copy/ro';
import * as store from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';
import { AllergiesScreen } from './AllergiesScreen';

jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));

const existing: Profile = { goals: ['weight'], allergens: ['Soia'], avoid: ['sweeteners'], onboarded: true };

beforeEach(async () => {
  jest.restoreAllMocks();
  await store.clearProfile();
  resetProfileHookState();
});

async function renderReady() {
  await store.saveProfile(existing);
  const screen = await render(<AllergiesScreen />);
  await screen.findByRole('checkbox', { name: ro.allergens.Lapte, disabled: false });
  return screen;
}

it('renders the title, the 14 allergens, the avoid switches and both notes in Romanian', async () => {
  const screen = await renderReady();
  for (const text of [ro.allergies.title, ro.allergies.lead, ro.allergies.avoidTitle,
    ro.allergies.allergensLabel, ro.result.missingAllergenNote]) {
    expect(screen.getByText(text, { exact: false })).toBeTruthy();
  }
  expect(screen.queryByText(ro.profile.savedLocally, { exact: false })).toBeNull();
  expect(screen.getAllByRole('checkbox')).toHaveLength(ALLERGENS.length);
  expect(screen.getAllByRole('switch')).toHaveLength(5);
  expect(screen.queryByText(ro.profile.goalTitle)).toBeNull();
});

it('renders the title like the Compare page title (22px) and the lead once', async () => {
  const screen = await renderReady();
  const style = StyleSheet.flatten(screen.getByRole('header', { name: ro.allergies.title }).props.style);
  expect(style.fontSize).toBe(22);
  expect(style.lineHeight).toBe(31.9);
  expect(screen.getAllByText(ro.allergies.lead)).toHaveLength(1);
});

it('announces the checked state and saves a toggled allergen through useProfile', async () => {
  const screen = await renderReady();
  const chip = (name: string) => screen.getByRole('checkbox', { name });
  expect(chip(ro.allergens.Soia).props.accessibilityState.checked).toBe(true);
  expect(chip(ro.allergens.Lapte).props.accessibilityState.checked).toBe(false);
  await act(async () => { await fireEvent.press(chip(ro.allergens.Lapte)); });
  await waitFor(() => expect(chip(ro.allergens.Lapte).props.accessibilityState.checked).toBe(true));
  expect(await store.loadProfile()).toEqual({ ...existing, allergens: ['Soia', 'Lapte'] });
});

it('marks selected chips with a check icon and the selected state, unselected without', async () => {
  const screen = await renderReady();
  const selected = screen.getByRole('checkbox', { name: ro.allergens.Soia });
  const unselected = screen.getByRole('checkbox', { name: ro.allergens.Lapte });
  expect(selected.props.accessibilityState.selected).toBe(true);
  expect(unselected.props.accessibilityState.selected).toBe(false);
  // The check icon is an extra child (svg) before the label.
  expect(selected.children).toHaveLength(2);
  expect(unselected.children).toHaveLength(1);
});

it('saves an avoid switch and announces it as a switch', async () => {
  const screen = await renderReady();
  const toggle = (name: string) => screen.getByRole('switch', { name });
  expect(toggle(ro.profile.sweeteners).props.accessibilityState.checked).toBe(true);
  await act(async () => { await fireEvent.press(toggle(ro.profile.palm_oil)); });
  await waitFor(() => expect(toggle(ro.profile.palm_oil).props.accessibilityState.checked).toBe(true));
  expect(await store.loadProfile()).toEqual({ ...existing, avoid: ['sweeteners', 'palm_oil'] });
});

it('shows the retry after a failed save and retries the same edit', async () => {
  const screen = await renderReady();
  jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(new Error('Storage failure'));
  await act(async () => { await fireEvent.press(screen.getByRole('checkbox', { name: ro.allergens.Gluten })); });
  await screen.findByText(ro.errors.generic);
  expect(await store.loadProfile()).toEqual(existing);
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry })); });
  await waitFor(() => expect(screen.queryByText(ro.errors.generic)).toBeNull());
  expect(await store.loadProfile()).toEqual({ ...existing, allergens: ['Soia', 'Gluten'] });
});
