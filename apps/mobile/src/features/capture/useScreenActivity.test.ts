import { useEffect } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useScreenActivity } from './useScreenActivity';

let mockEnter = () => {};
let mockLeave: (() => void) | undefined;
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void | (() => void)) => {
  jest.requireActual<typeof import('react')>('react').useEffect(() => {
    mockEnter = () => { mockLeave?.(); mockLeave = callback() || undefined; };
    mockEnter(); return () => mockLeave?.();
  }, [callback]);
} }));

it('rejects a result from before blur, refocus or unmount while accepting a new action', async () => {
  void useEffect;
  const view = await renderHook(useScreenActivity);
  const first = view.result.current.start();
  expect(view.result.current.isCurrent(first)).toBe(true);
  await act(() => mockLeave?.());
  expect(view.result.current.isCurrent(first)).toBe(false);
  await act(() => mockEnter());
  expect(view.result.current.isCurrent(first)).toBe(false);
  const next = view.result.current.start();
  expect(view.result.current.isCurrent(next)).toBe(true);
  await view.unmount();
  expect(view.result.current.isCurrent(next)).toBe(false);
});
