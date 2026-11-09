import { act, renderHook } from '@testing-library/react-native';
import { useSwUpdate } from './useSwUpdate.web';

const beforeWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const beforeNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let browser: EventTarget;
let applied: jest.Mock;
beforeEach(() => {
  browser = new EventTarget();
  applied = jest.fn();
  browser.addEventListener('okbite:sw-apply', applied);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
});
afterEach(() => {
  for (const [key, descriptor] of [['window', beforeWindow], ['navigator', beforeNavigator]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

it('announces updates without applying and applies once only after an explicit action', async () => {
  const { result } = await renderHook(() => useSwUpdate());
  await act(() => result.current.apply());
  expect(applied).not.toHaveBeenCalled();
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  expect(result.current.pending).toBe(true);
  expect(applied).not.toHaveBeenCalled();
  await act(() => { result.current.apply(); result.current.apply(); });
  expect(applied).toHaveBeenCalledTimes(1);
  expect(result.current.pending).toBe(false);
});

it('rejects a stale action after entering a protected route or unmounting', async () => {
  let allowed = true;
  const view = await renderHook(() => useSwUpdate(allowed));
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  const staleApply = view.result.current.apply;
  allowed = false;
  await view.rerender(undefined);
  await act(staleApply);
  expect(view.result.current.pending).toBe(true);
  expect(applied).not.toHaveBeenCalled();
  allowed = true;
  await view.rerender(undefined);
  const afterUnmount = view.result.current.apply;
  await view.unmount();
  afterUnmount();
  expect(applied).not.toHaveBeenCalled();
});

it('removes its event listener and subscribes again on remount', async () => {
  const remove = jest.spyOn(browser, 'removeEventListener');
  const first = await renderHook(() => useSwUpdate());
  await first.unmount();
  expect(remove).toHaveBeenCalledWith('okbite:sw-update', expect.any(Function));
  const second = await renderHook(() => useSwUpdate());
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  expect(second.result.current.pending).toBe(true);
  expect(applied).not.toHaveBeenCalled();
});

it('recovers an already waiting worker but never applies from an asynchronous lookup', async () => {
  let resolve!: (value: unknown) => void;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    serviceWorker: { getRegistration: () => new Promise(done => { resolve = done; }) },
  } });
  let allowed = true;
  const view = await renderHook(() => useSwUpdate(allowed));
  allowed = false;
  await view.rerender(undefined);
  await act(async () => { resolve({ waiting: {} }); });
  expect(view.result.current.pending).toBe(true);
  expect(applied).not.toHaveBeenCalled();
});

it.each(['rejection', 'throw', 'absent'])('ignores %s from service worker lookup', async failure => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    serviceWorker: failure === 'absent' ? undefined : { getRegistration: () => {
      if (failure === 'throw') throw new Error('Unavailable');
      return Promise.reject(new Error('Unavailable'));
    } },
  } });
  const { result } = await renderHook(() => useSwUpdate());
  expect(result.current.pending).toBe(false);
  expect(applied).not.toHaveBeenCalled();
});

it('is inert without a browser', async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
  const { result } = await renderHook(() => useSwUpdate());
  await act(() => result.current.apply());
  expect(result.current.pending).toBe(false);
});

it('ignores a waiting lookup after disposal or an explicit apply', async () => {
  let resolve!: (value: unknown) => void;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    serviceWorker: { getRegistration: () => new Promise(done => { resolve = done; }) },
  } });
  const first = await renderHook(() => useSwUpdate());
  await first.unmount();
  await act(async () => { resolve({ waiting: {} }); });
  expect(applied).not.toHaveBeenCalled();
  const second = await renderHook(() => useSwUpdate());
  await act(() => browser.dispatchEvent(new Event('okbite:sw-update')));
  await act(() => second.result.current.apply());
  await act(async () => { resolve({ waiting: {} }); });
  expect(second.result.current.pending).toBe(false);
  expect(applied).toHaveBeenCalledTimes(1);
});
