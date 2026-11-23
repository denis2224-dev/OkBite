import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

export const ACTION_WIDTH = 96;
const OPEN_AT = ACTION_WIDTH / 2;
const FAST_FLICK = 0.5;

/** The state of one swipeable row: how far it is dragged, and whether the action behind it is showing. */
export function useSwipeReveal(disabled: boolean) {
  const [x] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);
  // Where the row rests: 0 closed, -ACTION_WIDTH open.
  const rest = useRef(0);

  const settle = useCallback((open: boolean) => {
    rest.current = open ? -ACTION_WIDTH : 0;
    if (open) setRevealed(true);
    Animated.timing(x, { toValue: rest.current, duration: 140, useNativeDriver: false }).start(() => { if (!open) setRevealed(false); });
  }, [x]);
  // Only a clearly horizontal drag takes over, so the list still scrolls up and down.
  const claims = useCallback((dx: number, dy: number) => !disabled && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5, [disabled]);
  const drag = useCallback((dx: number) => {
    const next = Math.max(-ACTION_WIDTH, Math.min(0, rest.current + dx));
    if (next < 0) setRevealed(true);
    x.setValue(next);
  }, [x]);
  const release = useCallback((dx: number, vx: number) => settle(rest.current + dx < -OPEN_AT || vx < -FAST_FLICK), [settle]);
  const cancel = useCallback(() => settle(rest.current !== 0), [settle]);
  return { x, revealed, settle, claims, drag, release, cancel };
}
