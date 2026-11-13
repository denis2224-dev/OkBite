import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import Layout from '../_layout';
import Home from '../(tabs)/index';
import { ro } from '../../src/copy/ro';
import { noteResultOpened, resetInstallStateForTests } from '../../src/lib/installPrompt';

jest.mock('../../src/lib/installPrompt', () => jest.requireActual('../../src/lib/installPrompt.web'));
jest.mock('../../src/features/offline/useQueueFlush', () => ({ useQueueFlush: () => {} }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
const original = Object.fromEntries(['window', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let browser: EventTarget;
beforeEach(() => {
  browser = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Linux', maxTouchPoints: 0 } });
  resetInstallStateForTests();
  noteResultOpened('first'); noteResultOpened('second');
});
afterEach(() => {
  jest.useRealTimers();
  for (const key of ['window', 'navigator']) {
    const descriptor = original[key];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const History = () => null;
function offer() {
  const prompt = jest.fn(async () => ({ outcome: 'accepted' }));
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt, userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  browser.dispatchEvent(event); return { event, prompt };
}
it('captures an install offer on a cold non-Home route, including during startup', async () => {
  await renderRouter({ _layout: Layout, index: Home, history: History }, { initialUrl: '/history' });
  let saved!: ReturnType<typeof offer>;
  await act(() => { saved = offer(); });
  expect(saved.event.defaultPrevented).toBe(true);
  await act(() => { jest.advanceTimersByTime(2500); router.replace('/'); });
  expect(screen).toHavePathname('/');
  expect(saved.prompt).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  expect(saved.prompt).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: ro.pwa.install.action })).toBeNull();
});
it('retains an unused offer when Home unmounts and installs once after returning', async () => {
  await renderRouter({ _layout: Layout, index: Home, history: History });
  await act(() => { jest.advanceTimersByTime(2500); });
  let saved!: ReturnType<typeof offer>;
  await act(() => { saved = offer(); });
  expect(screen.getByRole('button', { name: ro.pwa.install.action })).toBeTruthy();
  await act(() => { router.replace('/history'); });
  expect(screen.queryByRole('button', { name: ro.home.photoButton })).toBeNull();
  await act(() => { router.replace('/'); });
  await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.action }));
  expect(saved.prompt).toHaveBeenCalledTimes(1);
  await act(() => { router.replace('/history'); });
  await act(() => { router.replace('/'); });
  expect(screen.queryByRole('button', { name: ro.pwa.install.action })).toBeNull();
});
