import { spacing } from '../../src/theme/tokens';
import { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../src/shared/ScreenSafeArea';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { TabPageHeader } from '../../src/shared/TabPageHeader';
import { Body, Button, Card, Heading } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { listHistory, type HistoryEntry } from '../../src/features/history/store';
import { displayScore } from '../../src/features/product/displayScore';
import { SourceCard } from '../../src/features/product/SourceCard';
import { ProductPicker } from '../../src/features/compare/ProductPicker';
import { compareRows } from '../../src/features/compare/compare';
import { formatAmount } from '../../src/lib/format';
import { useTheme } from '../../src/theme/useTheme';
import { useHomeTheme } from '../../src/theme/home';
import { type ComparisonTheme } from '../../src/theme/comparison';
import { HomeCard, HomeChip, HomeIcon, HomePressable } from '../../src/shared/HomeChrome';

const copy = ro.compare.design;

export default function Compare() {
  const theme = useHomeTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [picker, setPicker] = useState<'a' | 'b' | null>(null);
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
  if (a && b && rows.length) {
    const products = [{ entry: a, label: copy.productA }, { entry: b, label: copy.productB }];
    const fromProduct = Boolean(id);
    return <SafeAreaView edges={fromProduct ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.frame}>
        <TabPageHeader title={copy.title} subtitle={copy.subtitle(a.product.category.name, a.product.unit)} back={fromProduct}/>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
          <View style={styles.products}>{products.map(({ entry, label }) => {
            const { product } = entry;
            const score = displayScore(product, entry.score);
            const grade = score.grade === 'unavailable' ? 'neutral' : score.grade;
            return <HomeCard key={label} style={styles.productCard}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.tile}><Text style={styles.initials}>{product.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('ro')}</Text></View>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.subtitle}>{product.brand}</Text>
              {score.score !== null && <View style={styles.score}><HomeChip background={theme.colors[`${grade}Bg`]} color={theme.colors[grade]}>{`${formatAmount(score.score)} · ${ro.score[score.grade]}`}</HomeChip></View>}
              {product.status === 'unverified' && <Text style={styles.subtitle}>{ro.result.unverified}</Text>}
              {score.score === null ? <><Text style={styles.subtitle}>{ro.result.scoreUnavailable}</Text><Text style={styles.subtitle}>{ro.result.insufficient}</Text><Text style={styles.subtitle}>{ro.result.missing}</Text>{score.missing.map(key => <Text key={key} style={styles.subtitle}>{ro.result.nutrients[key]}</Text>)}</> : score.reasons.map((reason,index) => <View key={index}><Text style={styles.productName}>{reason.title}</Text><Text style={styles.subtitle}>{reason.detail}</Text></View>)}
              <Text style={styles.subtitle}>{ro.score.disclaimer}</Text>
              <SourceCard product={product}/>
            </HomeCard>;
          })}</View>
          <View style={styles.actions}>
            <HomePressable label={copy.swap} onPress={() => setPicker('b')} style={styles.secondary}><HomeIcon name="swap" size={18} /><Text style={styles.secondaryText}>{copy.swap}</Text></HomePressable>
            <HomePressable label={copy.category} onPress={() => setPicker('a')} style={styles.secondary}><Text style={styles.secondaryText}>{copy.category}</Text></HomePressable>
          </View>
          <HomeCard accessibilityRole="table" accessibilityLabel={copy.table(a.product.unit)} style={styles.table}>
            <View accessibilityRole="row" style={styles.tableHeader}><Text accessibilityRole="columnheader" style={[styles.label, styles.nutrientColumn]}>{ro.compare.per100(a.product.unit)}</Text><Text accessibilityRole="columnheader" style={[styles.label, styles.valueColumn]}>A</Text><Text accessibilityRole="columnheader" style={[styles.label, styles.valueColumn]}>B</Text></View>
            {rows.map(row => {
              const unit = row.key === 'kcal' ? 'kcal' : 'g';
              const difference = row.a === null || row.b === null ? null : row.a === row.b ? copy.same : copy.difference(formatAmount(Math.abs(row.a - row.b)), unit);
              return <View key={row.key} accessibilityRole="row" style={styles.tableRow}>
                <View accessibilityRole="rowheader" style={styles.nutrientColumn}><Text style={styles.nutrientName}>{row.key === 'sat' ? copy.saturated : ro.result.nutrients[row.key]}</Text>{difference !== null && <Text style={styles.difference}>{difference}</Text>}</View>
                {(['a', 'b'] as const).map(side => <Text key={side} accessibilityRole="cell" style={[styles.value, row.key !== 'kcal' && row.better === side && styles.favorable]}>{row[side] === null ? '' : `${formatAmount(row[side])} ${unit}`}</Text>)}
              </View>;
            })}
            <View style={styles.legend}><View style={styles.swatch} /><Text style={styles.legendText}>{copy.favorable}</Text></View>
          </HomeCard>
          <HomeCard style={styles.allergens}><Text accessibilityRole="header" style={styles.allergenTitle}>{ro.result.allergens}</Text><Text style={styles.allergenText}><Text style={styles.bold}>A:</Text> <Text>{a.product.allergens.join(', ') || copy.none}</Text></Text><Text style={[styles.allergenText, styles.allergenB]}><Text style={styles.bold}>B:</Text> <Text>{b.product.allergens.join(', ') || copy.none}</Text></Text></HomeCard>
          {products.map(({entry,label}) => entry.product.mayContain.length > 0 && <View key={label}><Text style={styles.allergenText}>{label} · <Text>{ro.result.mayContain}</Text></Text><Text style={styles.allergenText}>{entry.product.mayContain.join(', ')}</Text></View>)}
          <Text style={styles.footnote}>{ro.result.allergyNote}</Text>
          <Text style={styles.footnote}>{copy.footnote}</Text>
        </ScrollView>
      </View>
      <Modal visible={picker !== null} transparent animationType="none" onRequestClose={() => setPicker(null)}>
        <View style={styles.modal}><HomePressable label={ro.app.close} onPress={() => setPicker(null)} style={styles.dismiss} /><View accessibilityViewIsModal style={styles.pickerSheet}><ScrollView contentContainerStyle={styles.pickerContent}>
          {picker === 'a' ? <ProductPicker entries={entries} selected={a} excluded={b?.product.id} onSelect={entry => { select({ id, a: entry, b }); setPicker(null); }} /> : <ProductPicker entries={entries} selected={b} category={a?.product.category.slug} excluded={a?.product.id} onSelect={entry => { select({ id, a, b: entry }); setPicker(null); }} />}
          <Button variant="secondary" onPress={() => setPicker(null)}>{ro.app.close}</Button>
        </ScrollView></View></View>
      </Modal>
    </SafeAreaView>;
  }
  return <SafeAreaView edges={id ? ['top','bottom','left','right'] : ['top','left','right']} style={styles.safe}>
   <View style={styles.frame}>
    <TabPageHeader title={copy.title} subtitle={a ? copy.subtitle(a.product.category.name,a.product.unit) : undefined} back={Boolean(id)}/>
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.body,{gap:16}]} keyboardShouldPersistTaps="handled">
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
    </ScrollView>
   </View>
  </SafeAreaView>;
}

const createStyles = (t: ComparisonTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.ground },
  frame: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' }, loading: { opacity: 0 },
  header: { minHeight: 64, paddingTop: spacing.headerTop, paddingHorizontal: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rootHeader: { paddingLeft: 16 }, back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1 },
  title: { fontFamily: t.fonts.heading, fontSize: 20, lineHeight: 29, letterSpacing: -0.2, color: t.colors.ink },
  subtitle: { fontFamily: t.fonts.body, fontSize: 13, lineHeight: 18.85, color: t.colors.muted },
  scroll: { flex: 1 }, body: { paddingHorizontal: 16, paddingBottom: 24 },
  products: { flexDirection: 'row', gap: 10 }, productCard: { flex: 1, minWidth: 0, padding: 14 },
  label: { fontFamily: t.fonts.extra, fontSize: 12, lineHeight: 17.4, letterSpacing: 0.84, textTransform: 'uppercase', color: t.colors.muted },
  tile: { width: 48, height: 48, marginTop: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 21.75, color: t.colors.ink },
  productName: { marginTop: 8, fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 18.75, color: t.colors.ink }, score: { marginTop: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  secondary: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.mint },
  secondaryText: { flexShrink: 1, fontFamily: t.fonts.bold, fontSize: 14, lineHeight: 20.3, color: t.colors.primary, textAlign: 'center' },
  table: { marginTop: 12, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 12 },
  tableHeader: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8 },
  tableRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.colors.separator },
  nutrientColumn: { flex: 1.25, minWidth: 0 }, valueColumn: { flex: 1, textAlign: 'center' },
  nutrientName: { fontFamily: t.fonts.bold, fontSize: 14, lineHeight: 20.3, color: t.colors.ink },
  difference: { fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted },
  value: { flex: 1, minWidth: 0, textAlign: 'center', fontFamily: t.fonts.semibold, fontSize: 15, lineHeight: 21.75, color: t.colors.ink, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10, overflow: 'hidden' },
  favorable: { backgroundColor: t.colors.favorableBg, color: t.colors.favorable, fontFamily: t.fonts.extra },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, swatch: { width: 18, height: 14, borderRadius: 4, backgroundColor: t.colors.favorableBg },
  legendText: { flex: 1, fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted },
  allergens: { marginTop: 12, backgroundColor: t.colors.warningBg, borderColor: t.colors.warningBorder },
  allergenTitle: { fontFamily: t.fonts.heading, fontSize: 16, lineHeight: 23.2, letterSpacing: -0.16, color: t.colors.warning, marginBottom: 8 },
  allergenText: { fontFamily: t.fonts.body, fontSize: 14, lineHeight: 20.3, color: t.colors.warning }, allergenB: { marginTop: 4 }, bold: { fontFamily: t.fonts.bold },
  footnote: { marginTop: 12, marginHorizontal: 4, fontFamily: t.fonts.body, fontSize: 12, lineHeight: 17.4, color: t.colors.muted },
  modal: { flex: 1, backgroundColor: t.colors.scrim, justifyContent: 'flex-end', alignItems: 'center' }, dismiss: { flex: 1, width: '100%' },
  pickerSheet: { width: '100%', maxWidth: 430, maxHeight: '85%', backgroundColor: t.colors.ground, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, pickerContent: { padding: 16, gap: 12 },
});
