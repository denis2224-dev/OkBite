import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { InstallPrompt } from './InstallPrompt';
import { InstallPromptProvider } from '../lib/installPrompt';
import { ro } from '../copy/ro';
jest.mock('../lib/installPrompt', () => jest.requireActual('../lib/installPrompt.web'));
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
it('shows only iOS guidance, hides installed apps, and remembers dismissal on remount even with blocked storage', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'MacIntel', maxTouchPoints: 5 } });
  Object.defineProperty(browser, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  const view = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
  expect(screen.getByText(ro.pwa.install.iosHint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.pwa.install.title })).toBeNull();
  await act(() => { browser.dispatchEvent(new Event('appinstalled')); });
  expect(screen.queryByText(ro.pwa.install.iosHint)).toBeNull();
  await view.unmount();
  let stored: string | null = null;
  const storage = { getItem: jest.fn(() => stored), setItem: jest.fn((_key: string, value: string) => { stored = value; }) };
  Object.defineProperty(browser, 'localStorage', { configurable: true, value: storage });
  const second = await render(<InstallPrompt />, { wrapper: InstallPromptProvider });
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
