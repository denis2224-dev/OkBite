import 'fake-indexeddb/auto';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import SettingsTab from '../(tabs)/settings';
import { ThemeProvider } from '../../src/theme/useTheme';
import { ro } from '../../src/copy/ro';
import * as profileStore from '../../src/features/profile/store';
import { resetProfileHookState } from '../../src/features/profile/useProfile';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('../../src/features/profile/db', () => jest.requireActual('../../src/features/profile/db.web'));
jest.mock('../../src/copy/lang', () => jest.requireActual('../../src/copy/lang.web'));

beforeEach(async () => {
 jest.restoreAllMocks();
 jest.clearAllMocks();
 await AsyncStorage.clear();
 await profileStore.clearProfile();
 resetProfileHookState();
 const values = new Map<string, string>([['okbite.lang', 'ro']]);
 Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
 } });
 Object.defineProperty(window, 'location', { configurable: true, value: { reload: jest.fn() } });
 Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: 'ro' } } });
});

it('offers system, light and dark themes and restores the saved choice', async () => {
 const ui = await render(<ThemeProvider><SettingsTab /></ThemeProvider>);
 expect(ui.getByRole('button', {name:ro.settings.system}).props.accessibilityState.selected).toBe(true);
 await fireEvent.press(ui.getByRole('button', {name:ro.settings.dark}));
 await waitFor(() => expect(ui.getByRole('button', {name:ro.settings.dark}).props.accessibilityState.selected).toBe(true));
 expect(ui.getByRole('button', {name:ro.settings.system}).props.accessibilityState.selected).toBe(false);
 await waitFor(async () => expect(await AsyncStorage.getItem('okbite.appearance')).toBe('dark'));
 await ui.unmount();
 const reopened = await render(<ThemeProvider><SettingsTab /></ThemeProvider>);
 await waitFor(() => expect(reopened.getByRole('button', {name:ro.settings.dark}).props.accessibilityState.selected).toBe(true));
 await fireEvent.press(reopened.getByRole('button', {name:ro.settings.light}));
 expect(reopened.getByRole('button', {name:ro.settings.light}).props.accessibilityState.selected).toBe(true);
 await fireEvent.press(reopened.getByRole('button', {name:ro.settings.system}));
 expect(reopened.getByRole('button', {name:ro.settings.system}).props.accessibilityState.selected).toBe(true);
});

it('enables the implemented web language setter and restores the selected language', async () => {
 jest.spyOn(Platform, 'select').mockImplementation(spec => spec.web ?? ('default' in spec ? spec.default : undefined));
 window.localStorage.setItem('okbite.lang', 'en');
 const ui = await render(<SettingsTab />);
 expect(ui.getByRole('button', {name:ro.settings.english}).props.accessibilityState.selected).toBe(true);
 await fireEvent.press(ui.getByRole('button', {name:ro.settings.romanian}));
 expect(window.localStorage.getItem('okbite.lang')).toBe('ro');
 expect(document.documentElement.lang).toBe('ro');
 expect(window.location.reload).toHaveBeenCalledTimes(1);
});

it('keeps language selection disabled on native and legal destinations reachable', async () => {
 const ui = await render(<SettingsTab />);
 expect(ui.getByRole('button', {name:ro.settings.english})).toBeDisabled();
 for (const path of ['method', 'privacy', 'terms'] as const) {
  await fireEvent.press(ui.getByRole('button', {name:ro.settings[path]}));
  expect(router.push).toHaveBeenLastCalledWith(`/${path}`);
 }
});

it('persists only the onboarding reset before opening onboarding', async () => {
 const original = { goals: ['health'] as const, allergens: ['Lapte'] as const, avoid: ['palm_oil'] as const, onboarded: true };
 await profileStore.saveProfile({ ...original, goals: [...original.goals], allergens: [...original.allergens], avoid: [...original.avoid] });
 const ui = await render(<SettingsTab />);
 const reset = await ui.findByRole('button', {name:ro.settings.resetOnboarding});
 let finish!: () => void;
 let started!: () => void;
 const writing = new Promise<void>(resolve => { started = resolve; });
 const saved = profileStore.saveProfile;
 let saving!: ReturnType<typeof saved>;
 jest.spyOn(profileStore, 'saveProfile').mockImplementationOnce(profile => {
  started();
  saving = (async () => {
   await new Promise<void>(resolve => { finish = resolve; });
   return saved(profile);
  })();
  return saving;
 });
 await act(async () => {
  const pressing = fireEvent.press(reset);
  await writing;
  expect(router.replace).not.toHaveBeenCalled();
  finish();
  await saving;
  await pressing;
 });
 await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding'));
 expect(await profileStore.loadProfile()).toEqual({ ...original, onboarded: false });
});

it('keeps the saved profile and settings open when resetting fails', async () => {
 await profileStore.saveProfile({ goals: [], allergens: [], avoid: [], onboarded: true });
 const ui = await render(<SettingsTab />);
 const reset = await ui.findByRole('button', {name:ro.settings.resetOnboarding});
 jest.spyOn(profileStore, 'saveProfile').mockRejectedValueOnce(new Error('disk'));
 await fireEvent.press(reset);
 expect(router.replace).not.toHaveBeenCalled();
 expect(await ui.findByRole('alert')).toHaveTextContent(ro.errors.generic);
 expect((await profileStore.loadProfile()).onboarded).toBe(true);
});
