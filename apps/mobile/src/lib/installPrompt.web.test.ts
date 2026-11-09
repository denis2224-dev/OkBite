import { act, renderHook } from '@testing-library/react-native';
import { InstallPromptProvider, useInstallPrompt } from './installPrompt.web';
const { useInstallPrompt: useNative } = jest.requireActual<typeof import('./installPrompt')>('./installPrompt');

let browser: EventTarget, media: EventTarget & { matches: boolean };
const navigatorValue = { platform: 'Linux', maxTouchPoints: 0, standalone: false };
const original = Object.fromEntries(['window', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
beforeEach(() => {
  browser = new EventTarget(); media = Object.assign(new EventTarget(), { matches: false });
  Object.assign(navigatorValue, { platform: 'Linux', maxTouchPoints: 0, standalone: false });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(browser, { matchMedia: () => media }) });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigatorValue });
});
afterEach(() => {
  for (const key of ['window', 'navigator']) {
    const descriptor = original[key];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function offer(prompt: () => Promise<unknown> = jest.fn(async () => undefined), outcome = 'dismissed') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt, userChoice: Promise.resolve({ outcome }),
  });
  browser.dispatchEvent(event); return event;
}

it('defers installation until an offer, consumes it once across rapid/repeated calls', async () => {
  const { result } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
  expect(result.current.canInstall).toBe(false);
  let finish!: () => void;
  const prompt = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  let event!: ReturnType<typeof offer>;
  await act(() => { event = offer(prompt, 'accepted'); });
  expect(event.defaultPrevented).toBe(true); expect(result.current.canInstall).toBe(true);
  let first!: Promise<boolean | null>;
  await act(async () => {
    first = result.current.install();
    expect(await result.current.install()).toBe(false);
  });
  expect(result.current.canInstall).toBe(false);
  await act(async () => { finish(); expect(await first).toBe(true); });
  await act(() => { browser.dispatchEvent(event); });
  expect(result.current.canInstall).toBe(false);
  expect(await result.current.install()).toBe(false); expect(prompt).toHaveBeenCalledTimes(1);
});
it('handles rejected prompts and keeps a newer offer after an older promise settles', async () => {
  const { result } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
  let reject!: (error: Error) => void;
  await act(() => { offer(() => new Promise((_resolve, fail) => { reject = fail; })); });
  let pending!: Promise<boolean | null>;
  await act(() => { pending = result.current.install(); });
  await act(() => { offer(); });
  await act(async () => { reject(new Error('blocked')); expect(await pending).toBeNull(); });
  expect(result.current.canInstall).toBe(true);
  await act(async () => { expect(await result.current.install()).toBe(false); });
  expect(result.current.canInstall).toBe(false);
});
it('clears stale offers on standalone change and installation, then removes browser listeners', async () => {
  const remove = jest.spyOn(browser, 'removeEventListener'), removeMedia = jest.spyOn(media, 'removeEventListener');
  const { result, unmount } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
  await act(() => { offer(); media.matches = true; media.dispatchEvent(new Event('change')); });
  expect(result.current.isStandalone).toBe(true); expect(result.current.canInstall).toBe(false);
  expect(await result.current.install()).toBe(false);
  await act(() => { media.matches = false; media.dispatchEvent(new Event('change')); offer(); });
  expect(result.current.canInstall).toBe(true);
  await act(() => { browser.dispatchEvent(new Event('appinstalled')); offer(); });
  expect(result.current.isStandalone).toBe(true); expect(result.current.canInstall).toBe(false);
  await unmount();
  expect(remove.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining(['beforeinstallprompt', 'appinstalled', 'pageshow']));
  expect(removeMedia).toHaveBeenCalledWith('change', expect.any(Function));
});
it.each([['iPhone', 1, true], ['iPad', 5, true], ['MacIntel', 5, true], ['MacIntel', 0, false]])(
  'identifies %s with %i touch points', async (platform, maxTouchPoints, expected) => {
    Object.assign(navigatorValue, { platform, maxTouchPoints });
    const { result } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
    expect(result.current.isIos).toBe(expected);
  },
);
it('recognizes legacy iOS standalone mode and safe unsupported browser/native defaults', async () => {
  navigatorValue.standalone = true;
  Object.assign(window, { matchMedia: undefined });
  const { result, unmount } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
  expect(result.current.isStandalone).toBe(true); expect(await result.current.install()).toBe(false);
  await unmount();
  Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'navigator');
  const unsupported = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider }), native = await renderHook(useNative);
  for (const hook of [unsupported, native]) {
    expect(hook.result.current).toMatchObject({ canInstall: false, isIos: false, isStandalone: false });
    expect(await hook.result.current.install()).toBe(false);
  }
});
it('does not revive installation when an outstanding browser choice settles after appinstalled', async () => {
  const { result } = await renderHook(useInstallPrompt, { wrapper: InstallPromptProvider });
  let finish!: (value: { outcome: string }) => void;
  await act(() => {
    browser.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => undefined,
      userChoice: new Promise(resolve => { finish = resolve; }),
    }));
  });
  let pending!: Promise<boolean | null>;
  await act(() => { pending = result.current.install(); browser.dispatchEvent(new Event('appinstalled')); });
  await act(async () => { finish({ outcome: 'dismissed' }); await pending; });
  expect(result.current).toMatchObject({ isStandalone: true, canInstall: false });
  expect(await result.current.install()).toBe(false);
});
