import { Animated } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useSheetDrag } from './useSheetDrag';

const finishAtOnce = () => ({ start: (done?: (result: { finished: boolean }) => void) => done?.({ finished: true }) }) as unknown as Animated.CompositeAnimation;
let timing: jest.SpyInstance, spring: jest.SpyInstance;
beforeEach(() => {
  timing = jest.spyOn(Animated, 'timing').mockImplementation(finishAtOnce);
  spring = jest.spyOn(Animated, 'spring').mockImplementation(finishAtOnce);
});
afterEach(() => { timing.mockRestore(); spring.mockRestore(); });
const position = (hook: { result: { current: { y: unknown } } }) => (hook.result.current.y as { __getValue(): number }).__getValue();

it('follows the finger down but never moves up past where the sheet sits', async () => {
  const hook = await renderHook(() => useSheetDrag(jest.fn()));
  await act(async () => { hook.result.current.drag(70); });
  expect(position(hook)).toBe(70);
  await act(async () => { hook.result.current.drag(-90); });
  expect(position(hook)).toBe(0);
});

it('slides off the screen and closes once after a long pull down', async () => {
  const onClose = jest.fn();
  const hook = await renderHook(() => useSheetDrag(onClose));
  await act(async () => { hook.result.current.drag(200); });
  await act(async () => { hook.result.current.release(200, 0.2); });
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: expect.any(Number) }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('closes after a short but quick flick down', async () => {
  const onClose = jest.fn();
  const hook = await renderHook(() => useSheetDrag(onClose));
  await act(async () => { hook.result.current.release(40, 1.2); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('springs back, without closing, after a short slow pull or a cancelled one', async () => {
  const onClose = jest.fn();
  const hook = await renderHook(() => useSheetDrag(onClose));
  await act(async () => { hook.result.current.drag(40); });
  await act(async () => { hook.result.current.release(40, 0.2); });
  expect(spring).toHaveBeenCalledTimes(1);
  await act(async () => { hook.result.current.cancel(); });
  expect(spring).toHaveBeenCalledTimes(2);
  expect(onClose).not.toHaveBeenCalled();
});

it('springs back instead of closing while closing is not allowed (a report being sent)', async () => {
  const onClose = jest.fn();
  const hook = await renderHook(() => useSheetDrag(onClose, () => false));
  await act(async () => { hook.result.current.release(300, 2); });
  expect(onClose).not.toHaveBeenCalled();
  expect(spring).toHaveBeenCalledTimes(1);
});

it('claims a downward pull only while the content is at its top, and never an upward move', async () => {
  const hook = await renderHook(() => useSheetDrag(jest.fn()));
  expect(hook.result.current.claims(0, 14)).toBe(true);
  await act(async () => { hook.result.current.scrollTo(60); });
  expect(hook.result.current.claims(0, 14)).toBe(false);
  await act(async () => { hook.result.current.scrollTo(0); });
  expect(hook.result.current.claims(0, -14)).toBe(false);
});
