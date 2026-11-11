import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
it('keeps missing language/reset integrations explicit and persists the chosen theme', async () => {
  await render(<SettingsScreen />, { wrapper: ThemeProvider });
  expect(screen.getByRole('button', { name: ro.settings.english })).toBeDisabled();
  expect(screen.getByText(ro.settings.pending)).toBeTruthy();
  expect(screen.queryByText(ro.settings.resetOnboarding)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.dark }));
  expect(screen.getByRole('button', { name: ro.settings.dark }).props.accessibilityState.selected).toBe(true);
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('okbite.appearance', 'dark'));
});
it('passes language choices to N17 and opens existing legal destinations', async () => {
  const setLanguage = jest.fn();
  await render(<SettingsScreen currentLanguage="en" setLanguage={setLanguage} />);
  expect(screen.getByRole('button', { name: ro.settings.english }).props.accessibilityState.selected).toBe(true);
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
  expect(screen.getByRole('button', { name: ro.settings.install })).toBeDisabled();
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
