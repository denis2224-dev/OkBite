import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SettingsScreen } from './SettingsScreen';
import { ThemeProvider } from '../../theme/useTheme';
import { InstallPromptProvider } from '../../lib/installPrompt';
import { deleteHistory } from '../history/db';
import { ro } from '../../copy/ro';
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../history/db', () => ({ deleteHistory: jest.fn(async () => {}), readHistory: jest.fn(), writeHistory: jest.fn() }));
jest.mock('../../lib/installPrompt', () => jest.requireActual('../../lib/installPrompt.web'));
let browser: EventTarget;
beforeEach(() => {
  jest.clearAllMocks();
  browser = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Linux', maxTouchPoints: 0 } });
});
it('keeps missing language/reset integrations explicit and offers no theme choice', async () => {
  await render(<SettingsScreen />, { wrapper: ThemeProvider });
  expect(screen.getByRole('button', { name: ro.settings.language })).toBeDisabled();
  expect(screen.getByText(ro.settings.pending)).toBeTruthy();
  expect(screen.queryByText(ro.settings.resetOnboarding)).toBeNull();
  for (const label of ['După telefon', 'Luminos', 'Întunecat', 'Aspect']) expect(screen.queryByText(label)).toBeNull();
});
it('passes language choices to N17 and opens existing legal destinations', async () => {
  const setLanguage = jest.fn();
  await render(<SettingsScreen currentLanguage="en" setLanguage={setLanguage} />);
  expect(screen.queryByRole('button', { name: ro.settings.russian })).toBeNull(); // the choices open from the Language row
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.language }));
  expect(screen.getByRole('button', { name: ro.settings.english }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.russian }));
  expect(setLanguage).toHaveBeenCalledWith('ru');
  expect(screen.queryByRole('button', { name: ro.settings.romanian })).toBeNull(); // the list closes after a choice
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.language }));
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.romanian }));
  expect(setLanguage).toHaveBeenCalledWith('ro');
  for (const [label, path] of [[ro.settings.method, '/method'], [ro.settings.privacy, '/privacy'], [ro.settings.terms, '/terms']]) {
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(router.push).toHaveBeenLastCalledWith(path);
  }
});
it('confirms before clearing the real history store, then handles a failed deletion and retry', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistory }));
  expect(deleteHistory).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.cancel }));
  expect(deleteHistory).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistory }));
  jest.mocked(deleteHistory).mockRejectedValueOnce(new Error('disk'));
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistoryConfirm }));
  expect(screen.getByText(ro.history.clearError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistoryConfirm }));
  expect(deleteHistory).toHaveBeenCalledTimes(2);
  expect(screen.getByText(ro.history.cleared)).toBeTruthy();
  expect(screen.queryByText(ro.settings.clearHistoryTitle)).toBeNull();
});
it('uses the shared browser prompt only after a press and reports prompt failure', async () => {
  await render(<SettingsScreen />, { wrapper: InstallPromptProvider });
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.install }));
  expect(screen.getByText(ro.pwa.install.menuHint)).toBeTruthy();
  const prompt = jest.fn(async () => { throw new Error('blocked'); });
  await act(() => { browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'dismissed' }) })); });
  expect(prompt).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.install }));
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(screen.getByText(ro.pwa.install.failed)).toBeTruthy();
});
it('offers iOS install guidance without a browser prompt', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'iPhone', maxTouchPoints: 1 } });
  await render(<SettingsScreen />, { wrapper: InstallPromptProvider });
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.install }));
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
});
it('prevents duplicate deletion or cancellation while storage is busy', async () => {
  let finish!: () => void;
  jest.mocked(deleteHistory).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistory }));
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistoryConfirm }));
  expect(screen.getByRole('button', { name: ro.settings.clearHistoryConfirm })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.clearHistoryConfirm }));
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.cancel }));
  expect(deleteHistory).toHaveBeenCalledTimes(1);
  expect(screen.getByText(ro.settings.clearHistoryTitle)).toBeTruthy();
  await act(() => { finish(); });
  expect(screen.getByText(ro.history.cleared)).toBeTruthy();
});
it('is a grouped list: Profile, Language, App, Information, with only the existing rows', async () => {
  await render(<SettingsScreen setLanguage={jest.fn()} resetOnboarding={jest.fn()} />);
  expect(screen.getAllByRole('header').map(h => h.props.children)).toEqual([ro.settings.title, ro.settings.groupProfile, ro.settings.groupLanguage, ro.settings.groupApp, ro.settings.groupInfo]);
  const names = screen.getAllByRole('button').map(b => b.props.accessibilityLabel).filter(n => n !== 'Înapoi');
  expect(names).toEqual([ro.allergies.dietaryTitle, ro.allergies.allergenPrefsTitle, ro.settings.language, ro.settings.install, ro.settings.resetOnboarding, ro.settings.clearHistory, ro.settings.method, ro.settings.privacy, ro.settings.terms]);
  expect(screen.getByText(ro.settings.version, { exact: false })).toBeTruthy();
});
it('shows no count or "selected" text on the preference rows, and only Language shows a value', async () => {
  await render(<SettingsScreen currentLanguage="en" setLanguage={jest.fn()} />);
  expect(screen.queryByText(/selected|selectat|выбран/i)).toBeNull();
  expect(screen.getByText(ro.settings.english)).toBeTruthy(); // the current language, on the Language row
  for (const label of [ro.allergies.dietaryTitle, ro.allergies.allergenPrefsTitle]) {
    const row = screen.getByRole('button', { name: label });
    expect(within(row).getAllByText(/./)).toHaveLength(1); // the label only
  }
});
it('keeps every row label on one line', async () => {
  await render(<SettingsScreen setLanguage={jest.fn()} resetOnboarding={jest.fn()} />);
  for (const label of [ro.allergies.dietaryTitle, ro.allergies.allergenPrefsTitle, ro.settings.language, ro.settings.install, ro.settings.clearHistory, ro.settings.method, ro.settings.privacy, ro.settings.terms]) {
    const text = within(screen.getByRole('button', { name: label })).getByText(label);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
  }
});
it('opens the two preference pages from the Profile group', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.allergies.dietaryTitle }));
  expect(router.push).toHaveBeenLastCalledWith('/preferences/dietary');
  await fireEvent.press(screen.getByRole('button', { name: ro.allergies.allergenPrefsTitle }));
  expect(router.push).toHaveBeenLastCalledWith('/preferences/allergens');
});
it('draws the groups as small grey labels over white rounded cards, with a green icon tile on each row', async () => {
  await render(<SettingsScreen />);
  expect(screen.getAllByTestId('link-row-icon').length).toBeGreaterThanOrEqual(8);
  expect(StyleSheet.flatten(screen.getByText(ro.settings.groupProfile).props.style)).toMatchObject({ textTransform: 'uppercase', fontSize: 12 });
});
