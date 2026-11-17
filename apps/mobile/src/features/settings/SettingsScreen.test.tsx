import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { light, radii } from '../../theme/tokens';
import { router } from 'expo-router';
import { SettingsScreen } from './SettingsScreen';
import { ThemeProvider } from '../../theme/useTheme';
import { InstallPromptProvider } from '../../lib/installPrompt';
import { deleteHistory } from '../history/db';
import { ro } from '../../copy/ro';
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
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
  expect(screen.getByRole('button', { name: ro.settings.english })).toBeDisabled();
  expect(screen.getByText(ro.settings.pending)).toBeTruthy();
  expect(screen.queryByText(ro.settings.resetOnboarding)).toBeNull();
  for (const label of ['După telefon', 'Luminos', 'Întunecat', 'Aspect']) expect(screen.queryByText(label)).toBeNull();
});
it('passes language choices to N17 and opens existing legal destinations', async () => {
  const setLanguage = jest.fn();
  await render(<SettingsScreen currentLanguage="en" setLanguage={setLanguage} />);
  expect(screen.getByRole('button', { name: ro.settings.english }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: ro.settings.russian }));
  expect(setLanguage).toHaveBeenCalledWith('ru');
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
it('orders the groups Language, App (clear history last), Info with sentence-case headings', async () => {
  await render(<SettingsScreen setLanguage={jest.fn()} resetOnboarding={jest.fn()} />);
  const headings = screen.getAllByRole('header').map(h => h.props.children);
  expect(headings).toEqual([ro.settings.title, ro.settings.language, ro.settings.app, ro.settings.info]);
  expect(ro.settings.language).toBe('Limbă');
  const names = screen.getAllByRole('button').map(b => b.props.accessibilityLabel).filter(n => n !== 'Înapoi');
  expect(names).toEqual([ro.settings.romanian, ro.settings.russian, ro.settings.english, ro.settings.install, ro.settings.resetOnboarding, ro.settings.clearHistory, ro.settings.method, ro.settings.privacy, ro.settings.terms]);
  expect(screen.getByText(ro.settings.version, { exact: false })).toBeTruthy();
});
it('goes back to Profile from the header back button', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.app.back }));
  expect(router.back).toHaveBeenCalledTimes(1);
});
it('draws the language choice as a segmented pill: forest fill and white label when selected', async () => {
  await render(<SettingsScreen currentLanguage="en" setLanguage={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByTestId('language-segments').props.style)).toMatchObject({ borderRadius: radii.hero, backgroundColor: light.sageSoft });
  const style = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
  expect(style(ro.settings.english)).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill });
  expect(screen.getByText(ro.settings.english)).toHaveStyle({ color: light.onPrimary });
  expect(style(ro.settings.russian).backgroundColor).toBe(light.transparent);
  expect(screen.getByText(ro.settings.russian)).toHaveStyle({ color: light.primary });
});
it('groups the rows in flat cards and draws clear history in the terracotta tone', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText(ro.settings.clearHistory)).toHaveStyle({ color: light.low });
  expect(StyleSheet.flatten(screen.getByTestId('clear-history-icon').props.style)).toMatchObject({ backgroundColor: light.lowBg });
  expect(screen.getAllByTestId('link-row-icon').length).toBeGreaterThanOrEqual(4);
});
