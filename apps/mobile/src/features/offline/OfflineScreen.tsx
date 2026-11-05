import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { Button } from '../../ui/Button';
import { Body } from '../../ui/Typography';
import { Screen } from '../../ui/Screen';
import { listQueued } from '../history/db';
import { identifyCodeRoute, identifyPhotoRoute, productRoute } from '../identify/routes';
import { flushQueue, subscribeQueueResults } from './queue';

export default function OfflineScreen() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const unsubscribe = subscribeQueueResults(({ item, result }) => {
      if (!active.current) return false;
      const target = result.status === 'found' ? productRoute(result.product.id)
        : 'photoPath' in result ? identifyPhotoRoute(result) : identifyCodeRoute(item.payload);
      const route = typeof target === 'string' ? target : { ...target, params: { ...target.params, queueId: item.id } };
      router.replace(route);
      active.current = false;
      return true;
    });
    // Replay persisted needs_review responses without another identify request.
    void flushQueue().catch(() => { if (active.current) setFailed(true); });
    return () => { active.current = false; unsubscribe(); };
  }, [router]);
  const retry = async () => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setFailed(false);
    try {
      await flushQueue();
      const pending = await listQueued();
      if (active.current) setFailed(pending.length > 0);
    } catch { if (active.current) setFailed(true); }
    finally {
      busy.current = false;
      if (active.current) setWorking(false);
    }
  };
  return <Screen title={ro.offline.title}>
    <Body>{ro.offline.description}</Body>
    {failed ? <Body accessibilityRole="alert">{ro.offline.queueError}</Body> : null}
    <Button disabled={working} onPress={() => { void retry(); }}>{working ? ro.capture.working : ro.offline.retry}</Button>
    <Button variant="secondary" onPress={() => router.replace('/history')}>{ro.offline.history}</Button>
    <Button variant="ghost" onPress={() => router.replace('/')}>{ro.nav.home}</Button>
  </Screen>;
}
