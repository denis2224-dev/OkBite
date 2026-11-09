import { useState } from 'react';
import { View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import type { HistoryEntry } from '../history/store';
import { AllergenChip, Badge, Body, Button, Card } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ScoreCard } from '../product/ScoreCard';
import { SourceCard } from '../product/SourceCard';

export function ProductPicker({ entries, selected, category, excluded, onSelect }: {
  entries: HistoryEntry[]; selected?: HistoryEntry; category?: string; excluded?: string; onSelect(entry: HistoryEntry): void;
}) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const missing = selected ? (['kcal', 'sugar', 'sat', 'salt'] as const).filter(key => selected.product.nutrients[key] === null) : [];
  const options = entries.filter(entry => entry.product.status !== 'hidden' && entry.product.id !== excluded)
    .sort((a, b) => Number(b.product.category.slug === category) - Number(a.product.category.slug === category));
  return <Card>
    <Pressable accessibilityRole="button" accessibilityLabel={selected?.product.name ?? ro.compare.choose}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={{ minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.soft, justifyContent: 'center' }}>
      <Body>{selected?.product.name ?? ro.compare.choose}</Body>
    </Pressable>
    {selected && <Body>{selected.product.brand} · {selected.product.quantity}</Body>}
    {selected?.product.status === 'unverified' && <Badge tone="unverified">{ro.result.unverified}</Badge>}
    {selected && <ScoreCard score={missing.length ? { score: null, letter: null, grade: 'unavailable', reasons: [], missing } : selected.score} />}
    {selected && <>
      <Body>{ro.result.allergens}</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{selected.product.allergens.map(name => <AllergenChip key={name} name={name} />)}</View>
      {!selected.product.allergens.length && <Body>{ro.result.noAllergens}</Body>}
      {!!selected.product.mayContain.length && <><Body>{ro.result.mayContain}</Body><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {selected.product.mayContain.map(name => <AllergenChip key={name} name={name} />)}</View></>}
      <Body>{ro.result.allergyNote}</Body><SourceCard product={selected.product} />
    </>}
    {open && (!options.length ? <Body>{ro.history.empty}</Body> : options.map(entry => <Button key={entry.product.id} variant="ghost"
      onPress={() => { onSelect(entry); setOpen(false); }}>{`${entry.product.name} · ${entry.product.brand}`}</Button>))}
  </Card>;
}
