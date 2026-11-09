import { Text } from 'react-native';
import { act, renderRouter, screen, fireEvent, cleanup } from 'expo-router/testing-library';
import { router } from 'expo-router';
import Layout from '../../app/_layout';

jest.mock('../lib/useSwUpdate', () => jest.requireActual('../lib/useSwUpdate.web'));
jest.mock('../features/offline/useQueueFlush', () => ({ useQueueFlush: () => {} }));
jest.mock('../lib/errorReporter', () => ({ installErrorReporter: () => {}, setErrorScreen: () => {} }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('../features/startup/StartupGate', () => ({ StartupGate: ({ children }: { children: React.ReactNode }) => children }));

const beforeWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let browser: EventTarget;
let applied: jest.Mock;
beforeEach(() => {
  browser = new EventTarget();
  applied = jest.fn();
  browser.addEventListener('okbite:sw-apply', applied);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
});
afterEach(async () => {
  await cleanup();
  if (beforeWindow) Object.defineProperty(globalThis, 'window', beforeWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
const Page = () => <Text>Page</Text>;
const protectedPaths = ['/capture', '/capture/front', '/scan', '/scan/manual', '/identify', '/identify/confirm', '/add', '/add/review'];
const routes = Object.fromEntries(['index', 'history', 'capture-extra', ...protectedPaths.map(path => path.slice(1))].map(path => [path, Page]));

it('wires the banner into the actual shell, retaining updates across protected route transitions', async () => {
  await renderRouter({ ...routes, _layout: Layout });
  expect(screen.queryByText('Versiune nouă disponibilă')).toBeNull();
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  expect(screen.getByText('Versiune nouă disponibilă')).toBeTruthy();
  for (const path of protectedPaths) {
    await act(() => router.replace(path));
    expect(screen.queryByRole('button', { name: 'Actualizează' })).toBeNull();
    await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
    expect(applied).not.toHaveBeenCalled();
    await act(() => router.replace('/history'));
    expect(screen.getByRole('button', { name: 'Actualizează' })).toBeTruthy();
  }
  await act(() => router.replace('/capture-extra'));
  expect(screen.getByText('Versiune nouă disponibilă')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Actualizează' }));
  expect(applied).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Versiune nouă disponibilă')).toBeNull();
});

it('defers an update first received on an unsafe route until navigation is safe', async () => {
  await renderRouter({ ...routes, _layout: Layout }, { initialUrl: '/add/review' });
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  expect(screen.queryByText('Versiune nouă disponibilă')).toBeNull();
  await act(() => router.replace('/'));
  expect(screen.getByRole('button', { name: 'Actualizează' })).toBeTruthy();
  expect(applied).not.toHaveBeenCalled();
});
