import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Keep durable work independent of the screen that initiated it. */
export function useScreenActivity(onFocus?: () => void) {
  const onFocusRef = useRef(onFocus);
  useEffect(() => { onFocusRef.current = onFocus; }, [onFocus]);
  const generation = useRef(0);
  const focused = useRef(true);
  const leave = useCallback(() => { focused.current = false; generation.current++; }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    generation.current++;
    onFocusRef.current?.();
    return leave;
  }, [leave]));
  return {
    start: () => generation.current,
    isCurrent: (token: number) => focused.current && generation.current === token,
    leave,
  };
}
