import { renderHook, act } from '@testing-library/react-native';
import { useCameraAccess } from './useCameraAccess.web';
import { ro } from '../../copy/ro';

const secure = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');
const media = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const getUserMedia = jest.fn();
beforeEach(() => {
  getUserMedia.mockReset();
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
});
afterEach(() => {
  for (const [target, key, descriptor] of [[globalThis, 'isSecureContext', secure], [navigator, 'mediaDevices', media]] as const) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  }
});
it.each(['insecure', 'unsupported'])('does not request an inaccessible camera on %s browsers', async reason => {
  if (reason === 'insecure') Object.defineProperty(globalThis, 'isSecureContext', { value: false });
  else Object.defineProperty(navigator, 'mediaDevices', { value: undefined });
  const { result } = await renderHook(useCameraAccess);
  expect(result.current.message).toBe(reason === 'insecure' ? ro.pwa.camera.httpsRequired : ro.pwa.camera.unavailable);
  expect(result.current.canRetry).toBe(false);
  expect(result.current.permission?.granted).toBe(false);
  expect(getUserMedia).not.toHaveBeenCalled();
});
it.each([['NotAllowedError', 'browserDenied'], ['NotReadableError', 'busy'], ['NotFoundError', 'unavailable'] ] as const)('recovers from %s without native settings or an unhandled rejection', async (name, copy) => {
  const stop = jest.fn();
  getUserMedia.mockRejectedValueOnce(Object.assign(new Error(name), { name })).mockResolvedValue({ getTracks: () => [{ stop }] });
  const { result } = await renderHook(useCameraAccess);
  expect(result.current.message).toBe(ro.pwa.camera[copy]);
  expect(result.current.settingsAction).toBeUndefined();
  expect(result.current.canRetry).toBe(true);
  await act(async () => { await result.current.requestPermission(); });
  expect(result.current.permission?.granted).toBe(true);
  expect(result.current.message).toBeUndefined();
  expect(stop).toHaveBeenCalledTimes(1);
});
it('releases a permission-check stream that opens after leaving the screen', async () => {
  let finish!: (stream: unknown) => void;
  getUserMedia.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const stop = jest.fn();
  const { unmount } = await renderHook(useCameraAccess);
  await unmount();
  await act(async () => { finish({ getTracks: () => [{ stop }] }); });
  expect(stop).toHaveBeenCalledTimes(1);
});
