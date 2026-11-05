import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Body } from '../../src/ui/Typography';
import { Button } from '../../src/ui/Button';
import { ro } from '../../src/copy/ro';
import { listHistory, type HistoryEntry } from '../../src/features/history/store';
import { listQueued } from '../../src/features/history/db';
import { subscribeQueueResults } from '../../src/features/offline/queue';

export default function History() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [history, queue] = await Promise.all([listHistory(), listQueued()]);
        if (active) { setEntries(history); setPending(queue.length > 0); setFailed(false); }
      } catch { if (active) setFailed(true); }
    };
    void refresh();
    const unsubscribe = subscribeQueueResults(() => { void refresh(); return false; });
    return () => { active = false; unsubscribe(); };
  }, []));
  return <Screen title={ro.history.title}>
    {failed ? <Body accessibilityRole="alert">{ro.history.storageError}</Body> : null}
    {pending ? <Button onPress={() => router.replace('/offline')}>{ro.offline.retry}</Button> : null}
    {entries.length === 0 ? <Body>{ro.history.empty}</Body> : entries.map(({ product }) =>
      <Button key={product.id} variant="secondary" accessibilityLabel={ro.history.open(product.name)} onPress={() => router.replace(`/product/${product.id}`)}>{product.name}</Button>)}
  </Screen>;
}
