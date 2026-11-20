import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { shouldGoBack } from './swipeBack';

const LEAVE_MS = 170;

/** The page follows the finger while it is dragged from the left edge, then either slides off (and goes back) or springs home. */
export function useSwipeBackDrag(width: number, onBack: () => void) {
  const [x] = useState(() => new Animated.Value(0));
  const back = useRef(onBack);
  useEffect(() => { back.current = onBack; }, [onBack]);
  return useMemo(() => ({
    x,
    drag: (dx: number) => x.setValue(Math.min(Math.max(0, dx), width)),
    release: (dx: number, dy: number, vx: number) => {
      if (shouldGoBack(dx, dy, vx)) {
        Animated.timing(x, { toValue: width, duration: LEAVE_MS, useNativeDriver: false }).start(() => { back.current(); x.setValue(0); });
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
      }
    },
    cancel: () => { Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(); },
  }), [x, width]);
}
