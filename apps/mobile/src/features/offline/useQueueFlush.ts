import { useEffect, useRef } from 'react';
import { ro } from '../../copy/ro';
import { useToast } from '../../ui/Toast';
import { subscribeReconnect } from './connectivity';
import { flushQueue } from './queue';

export function useQueueFlush() {
  const toast = useToast();
  const latestToast = useRef(toast);
  useEffect(() => { latestToast.current = toast; }, [toast]);
  useEffect(() => {
    let active = true;
    const stop = subscribeReconnect(() => {
      void flushQueue().then(({ resolved }) => {
        if (active && resolved) latestToast.current(ro.offline.resolved(resolved));
      }).catch(() => { if (active) latestToast.current(ro.offline.queueError); });
    });
    return () => { active = false; stop(); };
  }, []);
}
