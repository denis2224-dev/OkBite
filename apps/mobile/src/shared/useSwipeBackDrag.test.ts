import { Animated } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useSwipeBackDrag } from './useSwipeBackDrag';

// Animations finish at once, so the tests check what the hook asks for, not how long it takes.
const finishAtOnce = () => ({ start: (done?: (result: { finished: boolean }) => void) => done?.({ finished: true }) }) as unknown as Animated.CompositeAnimation;
let timing: jest.SpyInstance, spring: jest.SpyInstance;
beforeEach(() => {
  timing = jest.spyOn(Animated, 'timing').mockImplementation(finishAtOnce);
  spring = jest.spyOn(Animated, 'spring').mockImplementation(finishAtOnce);
});
afterEach(() => { timing.mockRestore(); spring.mockRestore(); });
const position = (hook: { result: { current: { x: unknown } } }) => (hook.result.current.x as { __getValue(): number }).__getValue();

it('moves with the finger while it is dragged, never left of the edge or past the screen', async () => {
  const hook = await renderHook(() => useSwipeBackDrag(400, jest.fn()));
  await act(async () => { hook.result.current.drag(90); });
  expect(position(hook)).toBe(90);
  await act(async () => { hook.result.current.drag(-30); });
  expect(position(hook)).toBe(0);
  await act(async () => { hook.result.current.drag(900); });
  expect(position(hook)).toBe(400);
});

it('slides the page off the screen after a long swipe, goes back once, then puts the page back at 0', async () => {
  const onBack = jest.fn();
  const hook = await renderHook(() => useSwipeBackDrag(400, onBack));
  await act(async () => { hook.result.current.drag(150); });
  await act(async () => { hook.result.current.release(150, 5, 0.2); });
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 400 }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(position(hook)).toBe(0);
  expect(spring).not.toHaveBeenCalled();
});

it('goes back after a short but quick swipe', async () => {
  const onBack = jest.fn();
  const hook = await renderHook(() => useSwipeBackDrag(400, onBack));
  await act(async () => { hook.result.current.drag(40); });
  await act(async () => { hook.result.current.release(40, 2, 0.9); });
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('goes back only when the slide has finished', async () => {
  const onBack = jest.fn();
  let finish: (() => void) | undefined;
  timing.mockImplementation(() => ({ start: (done?: () => void) => { finish = done; } }) as unknown as Animated.CompositeAnimation);
  const hook = await renderHook(() => useSwipeBackDrag(400, onBack));
  await act(async () => { hook.result.current.release(150, 5, 0.2); });
  expect(onBack).not.toHaveBeenCalled();
  await act(async () => { finish?.(); });
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('springs back to 0 without going back after a short, slow or mostly vertical drag, and when the gesture is cancelled', async () => {
  const onBack = jest.fn();
  const hook = await renderHook(() => useSwipeBackDrag(400, onBack));
  await act(async () => { hook.result.current.release(30, 4, 0.1); }); // short and slow
  await act(async () => { hook.result.current.release(70, 90, 0.4); }); // mostly vertical
  await act(async () => { hook.result.current.cancel(); });
  expect(spring).toHaveBeenCalledTimes(3);
  for (const call of spring.mock.calls) expect(call[1]).toMatchObject({ toValue: 0 });
  expect(timing).not.toHaveBeenCalled();
  expect(onBack).not.toHaveBeenCalled();
});
