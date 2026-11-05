import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Button, Card, Heading } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { listHistory, type HistoryEntry } from '../../src/features/history/store';
import { ProductPicker } from '../../src/features/compare/ProductPicker';
import { compareRows } from '../../src/features/compare/compare';
import { formatAmount } from '../../src/lib/format';
import { useTheme } from '../../src/theme/useTheme';

export default function Compare() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selection, select] = useState<{ id: string | undefined; a?: HistoryEntry; b?: HistoryEntry }>({ id });
  const a = selection.id === id ? selection.a : undefined, b = selection.id === id ? selection.b : undefined;
  const [error, setError] = useState(false);
  const { colors } = useTheme();
  useFocusEffect(useCallback(() => {
    let active = true;
    void listHistory().then(items => {
      if (!active) return;
      const visible = items.filter(entry => entry.product.status !== 'hidden');
      setEntries(visible); setError(false);
      select(current => ({ id,
        a: visible.find(entry => entry.product.id === (current.id === id ? current.a?.product.id ?? id : id)),
        b: current.id === id ? visible.find(entry => entry.product.id === current.b?.product.id) : undefined,
      }));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]));
  const rows = a && b ? compareRows(a.product, b.product) : [];
  return <Screen title={ro.compare.title}>
    {error && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
    <ProductPicker entries={entries} selected={a} excluded={b?.product.id} onSelect={entry => select({ id, a: entry, b })} />
    <ProductPicker entries={entries} selected={b} category={a?.product.category.slug} excluded={a?.product.id} onSelect={entry => select({ id, a, b: entry })} />
    {a && b && (!rows.length ? <Body accessibilityLiveRegion="polite">{ro.compare.otherCategory}</Body> : <>
      <Heading style={{ fontSize: 18 }}>{ro.compare.per100(a.product.unit)}</Heading>
      {rows.map(row => <Card key={row.key}>
        <Heading style={{ fontSize: 18 }}>{ro.result.nutrients[row.key]}</Heading>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['a', 'b'] as const).map(side => <View key={side} style={{ flex: 1, padding: 8, borderRadius: 12,
            backgroundColor: row.better === side ? colors.goodBg : colors.soft }}>
            <Body>{side === 'a' ? a.product.name : b.product.name}</Body>
            <Body>{row[side] === null ? ro.result.undeclared : `${formatAmount(row[side])} ${row.key === 'kcal' ? 'kcal' : 'g'}`}</Body>
            {row.better === side && <Body>{ro.score.positive}</Body>}
          </View>)}
        </View>
      </Card>)}
    </>)}
    <Button variant="secondary" onPress={() => router.push('/capture')}>{ro.compare.photo}</Button>
  </Screen>;
}
