import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { InstallPrompt } from './InstallPrompt';
import { InstallPromptProvider, noteResultOpened, resetInstallStateForTests, useInstallPrompt } from '../lib/installPrompt';
import { ro } from '../copy/ro';
import { Button } from './Button';
jest.mock('../lib/installPrompt', () => jest.requireActual('../lib/installPrompt.web'));
const DAY = 24 * 60 * 60 * 1000;
function SettingsAction() {
  const { openSheet } = useInstallPrompt();
  return <Button onPress={openSheet}>{ro.pwa.install.title}</Button>;
}
const offer = (prompt: () => Promise<unknown>) => act(() => { browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
  prompt, userChoice: Promise.resolve({ outcome: 'dismissed' }),
})); });
const memoryStorage = () => {
  const items = new Map<string, string>();
  return { getItem: jest.fn((key: string) => items.get(key) ?? null), setItem: jest.fn((key: string, value: string) => { items.set(key, value); }) };
};
let browser: EventTarget;
beforeEach(() => {
  browser = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Linux', maxTouchPoints: 0 } });
  resetInstallStateForTests();
  noteResultOpened('first');
  noteResultOpened('second');
});
afterEach(() => { jest.restoreAllMocks(); });

it('stays hidden on first launch and invites only after two different product results', async () => {
  resetInstallStateForTests();
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: memoryStorage() });
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  await act(() => { noteResultOpened('first'); noteResultOpened('first'); });
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  await act(() => { noteResultOpened('second'); });
  expect(screen.getByText(ro.pwa.install.title)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.pwa.install.action })).toBeTruthy();
});

it('remembers opened results across reloads', async () => {
  const storage = memoryStorage();
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  resetInstallStateForTests();
  noteResultOpened('first'); noteResultOpened('second');
  resetInstallStateForTests();
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  expect(screen.getByText(ro.pwa.install.title)).toBeTruthy();
});

it('is a small banner docked under the screen content with a title and one action, never a modal or overlay', async () => {
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  const banner = StyleSheet.flatten(screen.getByTestId('install-banner').props.style);
  expect(banner).toEqual(expect.objectContaining({ borderTopWidth: 1 }));
  expect(banner.position).toBeUndefined();
  expect(banner.top).toBeUndefined();
  expect(screen.queryByTestId('install-sheet')).toBeNull();
  expect(screen.getByRole('button', { name: ro.app.close })).toBeTruthy();
});

it('hides unsupported browsers, offers one explicit install action, then reports failure', async () => {
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  const prompt = jest.fn(async () => { throw new Error('blocked'); });
  await offer(prompt);
  expect(prompt).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(screen.getByText(ro.pwa.install.failed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.pwa.install.action })).toBeNull();
});

it('does not report a failure when the user declines the browser dialog', async () => {
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {} } });
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  expect(screen.queryByText(ro.pwa.install.failed)).toBeNull();
});

it('suppresses the banner for 30 days after dismissal, then invites again', async () => {
  const storage = memoryStorage();
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  const now = jest.spyOn(Date, 'now').mockReturnValue(1_000 * DAY);
  const first = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  expect(storage.setItem).toHaveBeenCalledWith('okbite.install.dismissedAt.v1', String(1_000 * DAY));
  await first.unmount();
  resetInstallStateForTests(); noteResultOpened('first'); noteResultOpened('second');
  now.mockReturnValue(1_029 * DAY);
  const second = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  await second.unmount();
  now.mockReturnValue(1_031 * DAY);
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await offer(jest.fn(async () => undefined));
  expect(screen.getByText(ro.pwa.install.title)).toBeTruthy();
});

it('shows only iOS guidance, hides installed apps, and remembers dismissal on remount even with blocked storage', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'MacIntel', maxTouchPoints: 5 } });
  Object.defineProperty(browser, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  const view = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
  expect(screen.getByTestId('install-sheet').props.accessibilityViewIsModal).toBe(true);
  expect(screen.queryByRole('button', { name: ro.pwa.install.action })).toBeNull();
  await act(() => { browser.dispatchEvent(new Event('appinstalled')); });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await view.unmount();
  const storage = memoryStorage();
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  const second = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(storage.setItem).toHaveBeenCalledWith('okbite.install.dismissedAt.v1', expect.stringMatching(/^\d+$/));
  await second.unmount();
  const third = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(storage.getItem).toHaveBeenCalledWith('okbite.install.dismissedAt.v1');
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  await third.unmount();
  Object.defineProperty(browser, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
});

it('allows an explicit settings action after dismissal without clearing the preference', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'iPhone', maxTouchPoints: 1 } });
  const storage = { getItem: (key: string) => key === 'okbite.install.dismissedAt.v1' ? String(Date.now()) : null, setItem: jest.fn() };
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  await render(<><SettingsAction /><InstallPrompt /></>, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
  expect(storage.setItem).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  expect(storage.setItem).toHaveBeenCalledWith('okbite.install.dismissedAt.v1', expect.stringMatching(/^\d+$/));
});
