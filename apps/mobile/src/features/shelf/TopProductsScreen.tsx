import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { Button, Screen, SearchPill } from '../../ui';
import { TopProductRow } from './TopProductRow';
import { quickShelves, visibleShelves } from './searchShelves';
import { useTopProducts } from './useTopProducts';
import type { ShelfSlug } from './shelves';

/** "Cele mai bune produse": search for a type or pick one of five everyday ones, see its three best verified products by OkBite score. */
export function TopProductsScreen() {
  const { colors } = useTheme();
  const [slug, setSlug] = useState<ShelfSlug>(quickShelves[0]!.slug);
  const [query, setQuery] = useState('');
  const { status, picks, retry } = useTopProducts(slug);
  const shown = visibleShelves(query, slug, ro.scan.shelf.names);
  function choose(next: ShelfSlug) { setSlug(next); setQuery(''); }
  return <Screen title={ro.topProducts.title}>
    <SearchPill testID="type-search" value={query} onChangeText={setQuery} placeholder={ro.topProducts.search} filterIcon={false} />
    {shown.length === 0 ? <Text accessibilityRole="alert" allowFontScaling style={[styles.body, { color: colors.muted }]}>{ro.topProducts.noMatch}</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips} style={styles.strip}>
      {shown.map(shelf => {
        const selected = shelf.slug === slug;
        return <PressableOpacity key={shelf.slug} testID="type-chip" accessibilityRole="button" accessibilityLabel={ro.scan.shelf.names[shelf.slug]} accessibilityState={{ selected }}
          onPress={() => choose(shelf.slug)} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.soft }]}>
          <Text allowFontScaling style={[styles.chipText, { color: selected ? colors.onPrimary : colors.ink }]}>{ro.scan.shelf.names[shelf.slug]}</Text>
        </PressableOpacity>;
      })}
    </ScrollView>}
    {status === 'loading' ? <View accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading} style={styles.list}>
      {[0, 1, 2].map(row => <View key={row} style={[styles.placeholder, { backgroundColor: colors.track }]} />)}
    </View>
      : status === 'error' ? <View style={styles.message}>
        <Text accessibilityRole="alert" allowFontScaling style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.error}</Text>
        <Button variant="secondary" onPress={retry}>{ro.errors.retry}</Button>
      </View>
        : picks.length === 0 ? <Text allowFontScaling style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.empty}</Text>
          : <View accessibilityRole="list" style={styles.list}>{picks.map((pick, index) => <TopProductRow key={pick.product.id} pick={pick} rank={index + 1} />)}</View>}
  </Screen>;
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, marginHorizontal: -16 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  list: { gap: 10 },
  placeholder: { minHeight: 88, borderRadius: 22 },
  message: { gap: 12 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
});
