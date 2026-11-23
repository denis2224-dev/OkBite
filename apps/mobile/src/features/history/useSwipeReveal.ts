import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/** Width of the red delete card after the first swipe. */
export const ACTION_WIDTH = 96;
const OPEN_AT = ACTION_WIDTH / 2;
const FAST_FLICK = 0.5;
/** The second swipe must pull the red card past this share of the row to arm the delete. */
const ARM_SHARE = 0.55;

type Closer = () => void;
// Only one row may be open at a time: opening or dragging another row closes this one.
let active: { id: object; close: Closer } | null = null;

/** The state of one swipeable row: how much red is showing, from 0 (closed) to the row's width (covering the whole row). */
export function useSwipeReveal(disabled: boolean, onArmed: () => void) {
  const [reveal] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);
  const [width, setWidth] = useState(0);
  const [id] = useState(() => ({}));
  // How much red rests: 0 closed, ACTION_WIDTH after the first swipe, the full row once armed.
  const rest = useRef(0);
  // How much red the finger has pulled out right now.
  const shown = useRef(0);

  const go = useCallback((to: number, done?: () => void) => {
    rest.current = to;
    shown.current = to;
    Animated.timing(reveal, { toValue: to, duration: 140, useNativeDriver: false }).start(done);
  }, [reveal]);
  const close = useCallback(() => {
    if (active?.id === id) active = null;
    // Nothing showing (for example the question came from a screen reader): nothing to animate.
    if (rest.current === 0 && shown.current === 0) return;
    go(0, () => setRevealed(false));
  }, [go, id]);
  const claim = useCallback(() => {
    if (active && active.id !== id) active.close();
    active = { id, close };
  }, [close, id]);
  useEffect(() => () => { if (active?.id === id) active = null; }, [id]);

  // Only a clearly horizontal drag takes over, so the list still scrolls up and down.
  const claims = useCallback((dx: number, dy: number) => !disabled && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5, [disabled]);
  const drag = useCallback((dx: number) => {
    // From a closed row one swipe only opens the button; the whole row needs a second swipe.
    const limit = rest.current === 0 ? ACTION_WIDTH : Math.max(width, ACTION_WIDTH);
    const next = Math.max(0, Math.min(limit, rest.current - dx));
    if (next > 0) { setRevealed(true); claim(); }
    shown.current = next;
    reveal.setValue(next);
  }, [claim, reveal, width]);
  const release = useCallback((dx: number, vx: number) => {
    const shown = rest.current - dx;
    if (rest.current > 0 && width > 0 && shown > Math.max(ACTION_WIDTH * 1.5, width * ARM_SHARE)) {
      go(width, onArmed);
    } else if (shown > OPEN_AT || vx < -FAST_FLICK) {
      claim();
      go(ACTION_WIDTH);
    } else close();
  }, [claim, close, go, onArmed, width]);
  const cancel = useCallback(() => { if (rest.current > 0) go(ACTION_WIDTH); else close(); }, [close, go]);
  return { reveal, revealed, width, setWidth, close, claims, drag, release, cancel };
}
