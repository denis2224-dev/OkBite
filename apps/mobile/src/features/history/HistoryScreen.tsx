import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, Heading, Screen } from '../../ui';
import { ro } from '../../copy/ro';
import { displayScore } from '../product/displayScore';
import { roDate } from '../product/SourceCard';
import { clearHistory, listHistory, type HistoryEntry } from './store';
import { subscribeQueue } from '../offline/queue';

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'load' | 'clear' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const focused = useRef(false);
  const generation = useRef(0);
  const clearPending = useRef(false);

  const load = useCallback(async () => {
    if (clearPending.current) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await listHistory();
      if (focused.current && generation.current === request) setEntries(rows);
    } catch {
      if (focused.current && generation.current === request) setError('load');
    } finally {
      if (focused.current && generation.current === request) setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setClearing(clearPending.current);
    if (!clearPending.current) setConfirming(false);
    void load();
    const stop = subscribeQueue(() => { void load(); });
    return () => { focused.current = false; generation.current++; stop(); };
  }, [load]));

  async function confirmClear() {
    if (clearPending.current) return;
    clearPending.current = true;
    generation.current++;
    setLoading(false);
    setClearing(true);
    setError(null);
    try {
      await clearHistory();
      if (focused.current) { setEntries([]); setConfirming(false); }
    } catch {
      if (focused.current) setError('clear');
    } finally {
      clearPending.current = false;
      if (focused.current) setClearing(false);
    }
  }

  return (
    <Screen title={ro.history.title}>
      <Body>{ro.history.description}</Body>
      <Button variant="secondary" onPress={() => router.push('/offline')}>{ro.offline.queueTitle}</Button>
      {loading ? <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body> : null}
      {error ? <Card>
        <Body accessibilityRole="alert">{error === 'load' ? ro.history.loadError : ro.history.clearError}</Body>
        {error === 'load' ? <Button variant="secondary" onPress={() => void load()}>{ro.app.retry}</Button> : null}
      </Card> : null}
      {!loading && !error && entries.length === 0 ? <Card>
        <Heading>{ro.history.emptyTitle}</Heading><Body>{ro.history.empty}</Body>
      </Card> : null}
      {entries.length > 0 ? <>
        <Body>{ro.history.count(entries.length)}</Body>
        <View accessibilityRole="list" accessibilityLabel={ro.history.title} style={{ gap: 16 }}>
          {entries.map(({ product, score: storedScore, savedAt }) => {
            const score = displayScore(product, storedScore);
            return <Card key={product.id}>
            <Heading style={{ fontSize: 20, lineHeight: 27 }}>{product.name}</Heading>
            <Body>{product.brand} · {product.quantity}</Body>
            <Body>{score.score === null || score.grade === 'unavailable'
              ? ro.result.scoreUnavailable : `${ro.history.score(score.score)} · ${ro.score[score.grade]}`}</Body>
            <Body>{ro.score.disclaimer}</Body>
            <Body>{product.source}</Body>
            <Body>{ro.result.added}: {roDate(product.addedAt)}</Body>
            {product.status === 'verified' && product.verifiedAt
              ? <Body>{ro.result.checked}: {roDate(product.verifiedAt)}</Body>
              : <Body>{ro.result.unverified}</Body>}
            <Body>{ro.history.savedAt(roDate(savedAt.slice(0, 10)))}</Body>
            <Button variant="secondary" onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id, cached: '1' } })}>
              {ro.history.open(product.name)}
            </Button>
          </Card>; })}
        </View>
        {confirming ? <Card>
          <Heading style={{ fontSize: 20, lineHeight: 27 }}>{ro.history.clearTitle}</Heading>
          <Body>{ro.history.clearBody}</Body>
          <Button disabled={clearing} onPress={() => void confirmClear()}>{ro.history.clearConfirm}</Button>
          <Button variant="secondary" disabled={clearing} onPress={() => { setConfirming(false); setError(null); }}>{ro.app.cancel}</Button>
        </Card> : <Button variant="secondary" onPress={() => setConfirming(true)}>{ro.history.clear}</Button>}
      </> : null}
    </Screen>
  );
}
