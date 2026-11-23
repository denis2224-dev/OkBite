import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { claimsSheetDrag, shouldDismiss, sheetOffset } from '../shared/sheetGesture';

const LEAVE_PX = 900;
const LEAVE_MS = 180;

/** A bottom sheet follows the finger down, then either slides off (and closes) or springs back. It never moves up. */
export function useSheetDrag(onClose: () => void, canClose: () => boolean = () => true) {
  const [y] = useState(() => new Animated.Value(0));
  const close = useRef(onClose);
  const allowed = useRef(canClose);
  const scrolled = useRef(0);
  useEffect(() => { close.current = onClose; allowed.current = canClose; });
  return useMemo(() => {
    const home = () => Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    return {
      y,
      /** Whether this move is the sheet's own drag (a downward pull while the content is at its top). */
      claims: (dx: number, dy: number) => claimsSheetDrag(dx, dy, scrolled.current),
      /** Whether the content is at its top, so a pull that is already under way may move the sheet. */
      atTop: () => scrolled.current <= 0,
      /** Tell the hook how far the content is scrolled. */
      scrollTo: (offset: number) => { scrolled.current = offset; },
      drag: (dy: number) => y.setValue(sheetOffset(dy)),
      release: (dy: number, vy: number) => {
        if (shouldDismiss(dy, vy) && allowed.current()) Animated.timing(y, { toValue: LEAVE_PX, duration: LEAVE_MS, useNativeDriver: true }).start(() => close.current());
        else home();
      },
      cancel: home,
    };
  }, [y]);
}
