import { renderHook } from '@testing-library/react-native';
import { useSwUpdate } from './useSwUpdate';

it('keeps native updates inert regardless of route', async () => {
  for (const allowed of [true, false]) {
    const { result, unmount } = await renderHook(() => useSwUpdate(allowed));
    expect(result.current.pending).toBe(false);
    expect(result.current.apply()).toBeUndefined();
    await unmount();
  }
});
