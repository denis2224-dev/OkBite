import 'fake-indexeddb/auto';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ALLERGENS, type Profile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import * as store from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';
import { AllergenPreferencesScreen } from './AllergenPreferencesScreen';
import { DietaryPreferencesScreen } from './DietaryPreferencesScreen';

jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));

const existing: Profile = { goals: ['weight'], allergens: ['Soia'], avoid: ['sweeteners'], onboarded: true };

beforeEach(async () => {
  jest.restoreAllMocks();
  await store.clearProfile();
  resetProfileHookState();
  await store.saveProfile(existing);
});

describe('allergen preferences page', () => {
  async function ready() {
    const screen = await render(<AllergenPreferencesScreen />);
    await screen.findByRole('checkbox', { name: ro.allergens.Lapte, disabled: false });
    return screen;
  }

  it('shows the title and the 14 allergen chips, and nothing from the old screen', async () => {
    const screen = await ready();
    expect(screen.getByRole('header', { name: ro.allergies.allergenPrefsTitle })).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(ALLERGENS.length);
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.queryByText(ro.allergies.avoidTitle)).toBeNull();
    expect(screen.queryByText(ro.result.missingAllergenNote, { exact: false })).toBeNull();
  });

  it('saves a toggled allergen to the profile', async () => {
    const screen = await ready();
    const chip = (name: string) => screen.getByRole('checkbox', { name });
    expect(chip(ro.allergens.Soia).props.accessibilityState.checked).toBe(true);
    await act(async () => { await fireEvent.press(chip(ro.allergens.Lapte)); });
    await waitFor(() => expect(chip(ro.allergens.Lapte).props.accessibilityState.checked).toBe(true));
    expect(await store.loadProfile()).toEqual({ ...existing, allergens: ['Soia', 'Lapte'] });
  });

  it('shows the retry after a failed save and retries the same edit', async () => {
    const screen = await ready();
    jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(new Error('Storage failure'));
    await act(async () => { await fireEvent.press(screen.getByRole('checkbox', { name: ro.allergens.Gluten })); });
    await screen.findByText(ro.errors.generic);
    await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry })); });
    await waitFor(() => expect(screen.queryByText(ro.errors.generic)).toBeNull());
    expect(await store.loadProfile()).toEqual({ ...existing, allergens: ['Soia', 'Gluten'] });
  });
});

describe('dietary preferences page', () => {
  async function ready() {
    const screen = await render(<DietaryPreferencesScreen />);
    await screen.findByRole('switch', { name: ro.profile.palm_oil, disabled: false });
    return screen;
  }

  it('shows the title and the five avoid switches only', async () => {
    const screen = await ready();
    expect(screen.getByRole('header', { name: ro.allergies.dietaryTitle })).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(5);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText(ro.allergies.allergensLabel)).toBeNull();
  });

  it('saves a toggled switch and announces it as a switch', async () => {
    const screen = await ready();
    const toggle = (name: string) => screen.getByRole('switch', { name });
    expect(toggle(ro.profile.sweeteners).props.accessibilityState.checked).toBe(true);
    await act(async () => { await fireEvent.press(toggle(ro.profile.palm_oil)); });
    await waitFor(() => expect(toggle(ro.profile.palm_oil).props.accessibilityState.checked).toBe(true));
    expect(await store.loadProfile()).toEqual({ ...existing, avoid: ['sweeteners', 'palm_oil'] });
  });
});
