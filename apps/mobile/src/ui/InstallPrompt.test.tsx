import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InstallPrompt } from './InstallPrompt';
import { InstallPromptProvider, useInstallPrompt } from '../lib/installPrompt';
import { ro } from '../copy/ro';
import { Button } from './Button';
jest.mock('../lib/installPrompt', () => jest.requireActual('../lib/installPrompt.web'));
function SettingsAction() {
  const { openSheet } = useInstallPrompt();
  return <Button onPress={openSheet}>{ro.pwa.install.title}</Button>;
}
let browser: EventTarget;
beforeEach(() => {
  browser = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Linux', maxTouchPoints: 0 } });
});
it('hides unsupported browsers, offers one explicit install action, then reports failure', async () => {
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.title)).toBeNull();
  const prompt = jest.fn(async () => { throw new Error('blocked'); });
  await act(() => { browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt, userChoice: Promise.resolve({ outcome: 'dismissed' }),
  })); });
  expect(prompt).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(screen.getByText(ro.pwa.install.failed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.pwa.install.title })).toBeNull();
});
it('does not report a failure when the user declines the browser dialog', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Linux', maxTouchPoints: 0 } });
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {} } });
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await act(() => { browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: jest.fn(async () => undefined), userChoice: Promise.resolve({ outcome: 'dismissed' }),
  })); });
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  expect(screen.queryByText(ro.pwa.install.failed)).toBeNull();
});
it('shows only iOS guidance, hides installed apps, and remembers dismissal on remount even with blocked storage', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'MacIntel', maxTouchPoints: 5 } });
  Object.defineProperty(browser, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  const view = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
  expect(screen.getByLabelText(ro.pwa.install.description).props.accessibilityViewIsModal).toBe(true);
  expect(screen.queryByRole('button', { name: ro.pwa.install.title })).toBeNull();
  await act(() => { browser.dispatchEvent(new Event('appinstalled')); });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await view.unmount();
  let stored: string | null = null;
  const storage = { getItem: jest.fn(() => stored), setItem: jest.fn((_key: string, value: string) => { stored = value; }) };
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  const second = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(storage.setItem).toHaveBeenCalledWith('okbite.install.dismissed.v1', '1');
  await second.unmount();
  const third = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(storage.getItem).toHaveBeenCalledWith('okbite.install.dismissed.v1');
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await third.unmount();
  Object.defineProperty(browser, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
});

it('allows an explicit settings action after dismissal without clearing the preference', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'iPhone', maxTouchPoints: 1 } });
  const storage = { getItem: () => '1', setItem: jest.fn() };
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  await render(<><SettingsAction /><InstallPrompt /></>, { wrapper: InstallPromptProvider });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
  expect(storage.setItem).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  expect(storage.setItem).toHaveBeenCalledWith('okbite.install.dismissed.v1', '1');
});
