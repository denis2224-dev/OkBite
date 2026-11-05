import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Card, Heading, Screen } from '../../ui';
import { ro } from '../../copy/ro';
import { listQueue, retryQueued, completeQueued, subscribeQueue, resumeQueuedItem, type QueueEntry } from './queue';
import { productRoute } from '../identify/routes';

export function OfflineScreen() {
  const [rows, setRows] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<string>();
  const revision = useRef(0);
  const mounted = useRef(true);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const refresh = useCallback(() => {
    if (!mounted.current) return Promise.resolve();
    const current = ++revision.current;
    return listQueue().then(entries => {
      if (current === revision.current) { setRows(entries); setError(''); }
    }, () => {
      if (current === revision.current) setError(ro.offline.queueError);
    }).finally(() => { if (current === revision.current) setLoading(false); });
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const unsubscribe = subscribeQueue(() => { void refresh(); });
    return () => { mounted.current = false; invalidate(); unsubscribe(); };
  }, [refresh, invalidate]);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); if (mounted.current) { setConfirm(undefined); await refresh(); } }
    catch { if (mounted.current) setError(ro.offline.queueError); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <Screen title={ro.offline.queueTitle} back>
    <Body>{ro.offline.description}</Body>
    {loading ? <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body> : <Body>{ro.offline.pendingCount(rows.length)}</Body>}
    {!!error && <><Body accessibilityLiveRegion="polite">{error}</Body><Button disabled={busy} onPress={() => { void refresh(); }}>{ro.offline.reload}</Button></>}
    {!loading && !rows.length && <Card><Body>{ro.offline.emptyQueue}</Body></Card>}
    {rows.map(item => <Card key={item.id}>
      <Heading style={{ fontSize: 18 }}>{item.kind === 'photo' ? ro.offline.photo : ro.offline.code}</Heading>
      {item.kind === 'code' && <Body>{item.payload}</Body>}
      {item.outcome && <Body>{ro.offline.needsReview}</Body>}
      {item.status === 'completed' && <Body>{ro.offline.cleanupPending}</Body>}
      {item.error && <Body>{item.error in ro.errors ? ro.errors[item.error as keyof typeof ro.errors] : ro.offline.queueError}</Body>}
      <Button disabled={busy} onPress={() => { void run(async () => {
        if (!item.outcome) return retryQueued(item.id);
        const resumed = await resumeQueuedItem(item);
        router.replace(resumed.kind === 'found' ? productRoute(resumed.productId) : { pathname: '/identify', params: resumed.params });
      }); }}>{item.outcome ? ro.app.open : ro.app.retry}</Button>
      <Button variant="ghost" disabled={busy} onPress={() => setConfirm(item.id)}>{ro.offline.cancel}</Button>
      {confirm === item.id && <>
        <Body accessibilityLiveRegion="polite">{ro.offline.removeTitle}</Body>
        <Button disabled={busy} onPress={() => { void run(() => completeQueued(item.id)); }}>{ro.offline.removeConfirm}</Button>
        <Button variant="ghost" disabled={busy} onPress={() => setConfirm(undefined)}>{ro.app.cancel}</Button>
      </>}
    </Card>)}
    {busy && <Body accessibilityLiveRegion="polite">{ro.offline.processing}</Body>}
    <Button variant="secondary" onPress={() => router.push('/history')}>{ro.offline.history}</Button>
  </Screen>;
}
