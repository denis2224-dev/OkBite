import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../src/shared/ScreenSafeArea';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { TabPageHeader } from '../../src/shared/TabPageHeader';
import { Body, Button, Card, Heading } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { listHistory, type HistoryEntry } from '../../src/features/history/store';
import { ProductPicker } from '../../src/features/compare/ProductPicker';
import { betterOverall, compareRows, placeAdded, togglePick } from '../../src/features/compare/compare';
import { RecentProducts } from '../../src/features/compare/RecentProducts';
import { PhotoCard } from '../../src/features/compare/PhotoCard';
import { CompareCell } from '../../src/features/compare/CompareCell';
import { CompareVerdict } from '../../src/features/compare/CompareVerdict';
import { formatAmount } from '../../src/lib/format';
import { useTheme } from '../../src/theme/useTheme';
import { useHomeTheme } from '../../src/theme/home';
import { type ComparisonTheme } from '../../src/theme/comparison';
import { HomeCard } from '../../src/shared/HomeChrome';

const copy = ro.compare.design;

export default function Compare() {
  const theme = useHomeTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id, added } = useLocalSearchParams<{ id?: string; added?: string }>();
  // A product photographed from this page: it fills slot A, or slot B when A already has one. Applied once.
  const placedPhoto = useRef<string | undefined>(undefined);
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
      const photographed = added && placedPhoto.current !== added ? visible.find(entry => entry.product.id === added) : undefined;
      select(current => {
        const a = visible.find(entry => entry.product.id === (current.id === id ? current.a?.product.id ?? id : id));
        const b = current.id === id ? visible.find(entry => entry.product.id === current.b?.product.id) : undefined;
        return { id, ...(photographed ? placeAdded(a, b, photographed) : { a, b }) };
      });
      if (photographed) { placedPhoto.current = added; router.setParams({ added: undefined }); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id, added]));
  const rows = a && b ? compareRows(a.product, b.product) : [];
  // "Închide": back to the main Comparație page with nothing chosen.
  const close = () => { select({ id: undefined }); router.setParams({ id: undefined, added: undefined }); };
  if (a && b && rows.length) {
    const products = [{ entry: a, label: copy.productA, side: 'a' }, { entry: b, label: copy.productB, side: 'b' }] as const;
    const winner = betterOverall(a, b);
    const fromProduct = Boolean(id);
    return <SafeAreaView edges={fromProduct ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.frame}>
        <TabPageHeader title={copy.title} subtitle={copy.subtitle(a.product.category.name, a.product.unit)}/>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
          <View style={styles.products}>{products.map(({ entry, label, side }) => {
            const { product } = entry;
            // Minimal card: the photo and the name to its right. The better product gets a thumbs-up in the top right corner.
            return <HomeCard key={label} testID="compare-card" style={styles.productCard}>
              <View style={styles.identity}>
                {product.imageUrl
                  ? <Image testID="compare-photo" source={{ uri: product.imageUrl }} accessible={false} resizeMode="contain" style={styles.photo} />
                  : <View testID="compare-photo-tile" style={styles.photo} />}
                <Text numberOfLines={3} style={styles.productName}>{product.name}</Text>
              </View>
              <CompareVerdict better={winner === side} allergens={product.allergens} />
            </HomeCard>;
          })}</View>
          <View testID="compare-allergens" style={styles.allergenNote}>
            <Text accessibilityRole="header" style={styles.allergenTitle}>{ro.result.allergens}</Text>
            <Text style={styles.allergenText}><Text style={styles.bold}>A:</Text> {a.product.allergens.join(', ') || copy.none}</Text>
            <Text style={styles.allergenText}><Text style={styles.bold}>B:</Text> {b.product.allergens.join(', ') || copy.none}</Text>
          </View>
          <HomeCard accessibilityRole="table" accessibilityLabel={copy.table(a.product.unit)} style={styles.table}>
            <View accessibilityRole="row" style={styles.tableHeader}><Text accessibilityRole="columnheader" style={[styles.label, styles.nutrientColumn]}>{ro.compare.per100(a.product.unit)}</Text><Text accessibilityRole="columnheader" style={[styles.label, styles.valueColumn]}>A</Text><Text accessibilityRole="columnheader" style={[styles.label, styles.valueColumn]}>B</Text></View>
            {rows.map(row => {
              const unit = row.key === 'kcal' ? 'kcal' : 'g';
              const difference = row.a === null || row.b === null ? null : row.a === row.b ? copy.same : copy.difference(formatAmount(Math.abs(row.a - row.b)), unit);
              return <View key={row.key} accessibilityRole="row" style={styles.tableRow}>
                <View accessibilityRole="rowheader" style={styles.nutrientColumn}><Text style={styles.nutrientName}>{row.key === 'sat' ? copy.saturated : ro.result.nutrients[row.key]}</Text>{difference !== null && <Text style={styles.difference}>{difference}</Text>}</View>
                {(['a', 'b'] as const).map(side => <CompareCell key={side} testID={`compare-cell-${row.key}-${side}`} value={row[side]} unit={unit} better={row.key !== 'kcal' && row.better === side} />)}
              </View>;
            })}
            <View style={styles.legend}><View style={styles.swatch} /><Text style={styles.legendText}>{copy.favorable}</Text></View>
          </HomeCard>
        </ScrollView>
        {/* Fixed under the scrolling content, right above the navigation bar. */}
        <View testID="compare-close-footer" style={styles.closeFooter}><Button onPress={close}>{ro.app.close}</Button></View>
      </View>
    </SafeAreaView>;
  }
  return <SafeAreaView edges={id ? ['top','bottom','left','right'] : ['top','left','right']} style={styles.safe}>
   <View style={styles.frame}>
    <TabPageHeader title={copy.title} subtitle={a ? copy.subtitle(a.product.category.name,a.product.unit) : undefined}/>
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.body,{gap:16}]} keyboardShouldPersistTaps="handled">
    {error && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
    <ProductPicker slot={copy.productA} entries={entries} selected={a} excluded={b?.product.id} onSelect={entry => select({ id, a: entry, b })} />
    <ProductPicker slot={copy.productB} entries={entries} selected={b} category={a?.product.category.slug} excluded={a?.product.id} onSelect={entry => select({ id, a, b: entry })} />
    <View testID="recent-section" style={{ marginTop: 28 }}><RecentProducts entries={entries} a={a} b={b} onPick={entry => select({ id, ...togglePick(a, b, entry) })} /></View>
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
    <PhotoCard />
    </ScrollView>
   </View>
  </SafeAreaView>;
}

const createStyles = (t: ComparisonTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.ground },
  frame: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' },
  subtitle: { fontFamily: t.fonts.body, fontSize: 13, lineHeight: 18.85, color: t.colors.muted },
  closeFooter: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  scroll: { flex: 1 }, body: { paddingHorizontal: 16, paddingBottom: 24 },
  products: { flexDirection: 'row', alignItems: 'stretch', gap: 12 }, productCard: { flex: 1, minWidth: 0, minHeight: 120, padding: 14, justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14 },
  photo: { width: 56, height: 56, borderRadius: 14, backgroundColor: t.colors.mint },
  reasons: { marginTop: 16, gap: 16 }, reason: { gap: 4 },
  reasonTitle: { fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 20, color: t.colors.ink },
  reasonDetail: { fontFamily: t.fonts.body, fontSize: 13, lineHeight: 19.5, color: t.colors.muted },
  footer: { marginTop: 'auto', paddingTop: 14 },
  disclaimer: { fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.separator },
  label: { fontFamily: t.fonts.extra, fontSize: 12, lineHeight: 17.4, letterSpacing: 0.84, textTransform: 'uppercase', color: t.colors.muted },
  productName: { flex: 1, minWidth: 0, fontFamily: t.fonts.extra, fontSize: 16, lineHeight: 21, color: t.colors.ink }, score: { marginTop: 12, alignSelf: 'flex-start' },
  table: { marginTop: 12, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 12 },
  tableHeader: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8 },
  tableRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.colors.separator },
  nutrientColumn: { flex: 1.25, minWidth: 0 }, valueColumn: { flex: 1, textAlign: 'center' },
  nutrientName: { fontFamily: t.fonts.bold, fontSize: 14, lineHeight: 20.3, color: t.colors.ink },
  difference: { fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, swatch: { width: 18, height: 14, borderRadius: 4, backgroundColor: t.colors.favorableBg },
  legendText: { flex: 1, fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted },
  allergenNote: { marginTop: 12, gap: 3 },
  allergenTitle: { fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 21, color: t.colors.ink },
  allergenText: { fontFamily: t.fonts.medium, fontSize: 14, lineHeight: 20, color: t.colors.ink }, bold: { fontFamily: t.fonts.extra },
});
