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
    const show = (message: string) => { if (active) toast(message); };
    const connected = (state: NetInfoState) => {
      if (!active) return;
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (!online && previous !== false) toast(ro.offline.banner, { label: ro.offline.history, onPress: () => router.push('/history') });
      previous = online;
      if (online) void flushQueue(id => {
        if (active) toast(ro.offline.resolved(1), { label: ro.app.open, onPress: () => router.push(`/product/${id}`) });
      }).catch(() => show(ro.offline.queueError));
    };
    const check = () => { void NetInfo.fetch().then(connected).catch(() => show(ro.offline.queueError)); };
    const unsubscribe = NetInfo.addEventListener(connected);
    const app = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    const events = subscribeQueue(event => { if (event === 'missing_photo') show(ro.offline.photoMissing); });
    check();
    return () => { active = false; unsubscribe(); app.remove(); events(); };
  }, [toast]);
}
