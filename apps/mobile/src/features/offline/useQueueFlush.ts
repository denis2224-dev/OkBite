import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { flushQueue, subscribeQueue } from './queue';
import { useToast } from '../../ui/Toast';
import { ro } from '../../copy/ro';
export function useQueueFlush() {
  const toast = useToast();
  useEffect(() => {
    let active = true;
    let previous: boolean | undefined;
    let isOnline = false;
    let isFlushing = false;
    let rerunPending = false;

    const show = (message: string) => { if (active) toast(message); };

    const runFlush = async () => {
      if (isFlushing) {
        rerunPending = true;
        return;
      }
      isFlushing = true;
      try {
        await flushQueue(id => {
          if (active) toast(ro.offline.resolved(1), { label: ro.app.open, onPress: () => router.push(`/product/${id}`) });
        });
      } catch {
        show(ro.offline.queueError);
      } finally {
        isFlushing = false;
        if (rerunPending && isOnline && active) {
          rerunPending = false;
          void runFlush();
        } else {
          rerunPending = false;
        }
      }
    };

    const connected = (state: NetInfoState) => {
      if (!active) return;
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (!online && previous !== false) toast(ro.offline.banner, { label: ro.offline.history, onPress: () => router.push('/history') });
      previous = online;
      isOnline = online;
      if (online) void runFlush();
    };

    const check = () => { void NetInfo.fetch().then(connected).catch(() => show(ro.offline.queueError)); };
    const unsubscribe = NetInfo.addEventListener(connected);
    const app = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    const events = subscribeQueue(event => {
      if (event === 'missing_photo') show(ro.offline.photoMissing);
      if (event === 'enqueued' && isOnline) void runFlush();
    });
    check();
    return () => { active = false; unsubscribe(); app.remove(); events(); };
  }, [toast]);
}
