import { act, renderHook } from '@testing-library/react-native';
import { useInstallDismissal } from './installPrompt.web';

it('keeps dismissal across remount when browser storage rejects access', async () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    get localStorage() { throw new Error('storage disabled'); },
  } });
  try {
    const { result, unmount } = await renderHook(useInstallDismissal);
    expect(result.current[0]).toBe(false);
    await act(() => { result.current[1](); });
    expect(result.current[0]).toBe(true);
    await unmount();
    expect((await renderHook(useInstallDismissal)).result.current[0]).toBe(true);
  } finally {
    if (before) Object.defineProperty(globalThis, 'window', before);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
