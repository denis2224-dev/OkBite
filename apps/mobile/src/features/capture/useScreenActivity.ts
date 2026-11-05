import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Keep durable work independent of the screen that initiated it. */
export function useScreenActivity() {
  const generation = useRef(0);
  const focused = useRef(true);
  const leave = useCallback(() => { focused.current = false; generation.current++; }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    generation.current++;
    return leave;
  }, [leave]));
  return {
    start: () => generation.current,
    isCurrent: (token: number) => focused.current && generation.current === token,
    leave,
  };
}
