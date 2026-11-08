import { spacing } from '../../src/theme/tokens';
import { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenSafeArea as SafeAreaView } from '../../src/shared/ScreenSafeArea';
import { useNetInfo } from '@react-native-community/netinfo';
import { ro } from '../../src/copy/ro';
import { useHomeTheme, type HomeTheme } from '../../src/theme/home';
import { AppLogo } from '../../src/shared/AppLogo';
import { useTheme } from '../../src/theme/useTheme';
import { HomeCard, HomeChip, HomeIcon, HomePressable } from '../../src/shared/HomeChrome';
import { listHistory, type HistoryEntry } from '../../src/features/history/store';
import { displayScore } from '../../src/features/product/displayScore';

const copy = ro.home.design;
const legend = [
  { grade: 'good', range: ro.home.legendGood, label: ro.home.good },
  { grade: 'medium', range: ro.home.legendMedium, label: copy.medium },
  { grade: 'low', range: ro.home.legendLow, label: copy.low },
] as const;
function recentTime(savedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(savedAt).getTime()) / 60000));
  if (minutes < 1) return copy.now;
  const relative = new Intl.RelativeTimeFormat('ro', { numeric: 'auto', style: 'short' });
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (minutes < 1440) return relative.format(-Math.floor(minutes / 60), 'hour');
  return new Date(savedAt).toLocaleDateString('ro-RO');
}
export default function Home() {
  const t = useHomeTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const { isDark, setPreference } = useTheme();
  const network = useNetInfo();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [demo, setDemo] = useState<'online' | 'offline' | 'empty'>('online');
  useFocusEffect(useCallback(() => {
    let active = true;
    void listHistory().then(rows => { if (active) setHistory(rows); }).catch(() => {});
    return () => { active = false; };
  }, []));
  const offline = network.isConnected === false || network.isInternetReachable === false || demo === 'offline';
  const recent = demo === 'empty' ? [] : history.slice(0, 3);
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
    <View style={s.frame}>
      {offline && <View accessibilityRole="alert" style={s.offline}><HomeIcon name="offline" size={18} color={t.colors.heroText} /><Text style={s.offlineText}>{copy.offline}</Text></View>}
      <View style={s.top}>
        <View style={s.brand}><AppLogo/><Text accessibilityRole="header" style={s.brandText}>{copy.brand}</Text></View>
        <HomePressable label={copy.demo} onPress={() => setShowDemo(true)} style={s.demo}><HomeIcon name="sliders" size={18} /><Text style={s.demoText}>{copy.demo}</Text></HomePressable>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View pointerEvents="none" style={s.decoration}><HomeIcon name="logo" size={150} strokeWidth={1} color={t.colors.accent} /></View>
          <Text style={[s.label, s.heroLabel]}>{ro.home.eyebrow}</Text>
          <Text accessibilityRole="header" style={s.title}>{ro.home.title}</Text>
          <Text style={s.heroDescription}>{copy.description}</Text>
        </View>
        <View style={s.actions}>
          <HomePressable label={copy.photo} onPress={() => router.push('/capture')} style={s.action}><View style={s.actionIcon}><HomeIcon name="camera" size={22} /></View><View style={s.actionCopy}><Text style={s.actionTitle}>{copy.photo}</Text><Text style={s.caption}>{copy.photoHint}</Text></View></HomePressable>
          <HomePressable label={ro.home.compare} onPress={() => router.navigate('/compare')} style={s.action}><View style={s.actionIcon}><HomeIcon name="bars" size={22} /></View><View style={s.actionCopy}><Text style={s.actionTitle}>{ro.home.compare}</Text><Text style={s.caption}>{copy.compareHint}</Text></View></HomePressable>
        </View>
        <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>{copy.recent}</Text><HomePressable label={ro.home.allHistory} onPress={() => router.navigate('/history')} style={s.link}><Text style={s.linkText}>{ro.home.allHistory}</Text></HomePressable></View>
        {recent.length ? <HomeCard style={s.list}>{recent.map(({ product, score, savedAt }, index) => {
          const shown = displayScore(product, score);
          const grade = shown.grade === 'unavailable' ? 'neutral' : shown.grade;
          const tint = t.tiles[index % t.tiles.length]!;
          const initials = product.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('ro');
          return <HomePressable key={product.id} label={ro.history.open(product.name)} onPress={() => router.push(`/product/${product.id}`)} style={[s.row, index > 0 && s.rowBorder]}>
            <View style={[s.tile, { backgroundColor: tint.background }]}><Text style={[s.tileText, { color: tint.foreground }]}>{initials}</Text></View>
            <View style={s.product}><Text style={s.productName}>{product.name}</Text><Text style={s.caption}>{product.brand} · {recentTime(savedAt)}</Text></View>
            <HomeChip background={t.colors[`${grade}Bg`]} color={t.colors[grade]}>{shown.score === null ? '—' : String(shown.score)}</HomeChip>
          </HomePressable>;
        })}</HomeCard> : <HomeCard><Text style={s.empty}>{copy.empty}</Text></HomeCard>}
        <HomeCard style={s.legend}>
          <Text style={s.label}>{ro.home.legend}</Text>
          <View style={s.legendRows}>{legend.map(item => <View key={item.grade} style={s.legendRow}><HomeChip background={t.colors[`${item.grade}Bg`]} color={t.colors[item.grade]} minWidth={76}>{item.range}</HomeChip><Text style={s.legendText}>{item.label}</Text></View>)}</View>
          <Text style={s.footnote}>{copy.footnote}</Text>
        </HomeCard>
      </ScrollView>
      <View style={s.dock}><HomePressable label={copy.scan} onPress={() => router.push('/scan')} style={s.scan}><HomeIcon name="scan" color={t.colors.onPrimary} /><Text style={s.scanText}>{copy.scan}</Text></HomePressable></View>
    </View>
    <Modal visible={showDemo} transparent animationType="none" onRequestClose={() => setShowDemo(false)}>
      <View style={s.modal}>
        <HomePressable label={ro.app.close} onPress={() => setShowDemo(false)} style={s.dismiss} />
        <HomeCard accessibilityViewIsModal style={s.sheet}>
          <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
            <View style={s.sheetHeader}><Text accessibilityRole="header" style={s.sectionTitle}>{copy.demo}</Text><HomePressable label={ro.app.close} onPress={() => setShowDemo(false)} style={s.iconHit}><HomeIcon name="close" size={20} color={t.colors.ink}/></HomePressable></View>
            <View accessibilityRole="radiogroup" accessibilityLabel={ro.app.settings} style={s.appearance}>
              <Text style={s.appearanceLabel}>{ro.app.settings}</Text>
              <View style={s.appearanceButtons}>{(['light', 'dark'] as const).map(mode => {
                const selected = mode === (isDark ? 'dark' : 'light');
                return <HomePressable key={mode} label={copy.themeLabels[mode]} accessibilityRole="radio" accessibilityState={{ checked: selected, selected }} onPress={() => setPreference(mode)} style={s.iconHit}>
                  <View style={[s.themeVisual, { backgroundColor: selected ? t.colors.themeSelected : t.colors.themeButton }]}><HomeIcon name={mode === 'light' ? 'sun' : 'moon'} size={20} color={selected ? t.colors.themeSelectedIcon : t.colors.themeIcon}/></View>
                </HomePressable>;
              })}</View>
            </View>
            {(['online', 'offline', 'empty'] as const).map(mode => <HomePressable key={mode} label={copy.states[mode]} onPress={() => { setDemo(mode); setShowDemo(false); }} style={s.demoOption}><Text style={s.productName}>{copy.states[mode]}</Text></HomePressable>)}
          </ScrollView>
        </HomeCard>
      </View>
    </Modal>
  </SafeAreaView>;
}
const createStyles = (t: HomeTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.ground },
  frame: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' }, loading: { opacity: 0 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: t.colors.offline },
  offlineText: { flex: 1, color: t.colors.heroText, fontFamily: t.fonts.semibold, fontSize: 13, lineHeight: 18.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: spacing.headerTop, paddingHorizontal: 16, paddingBottom: 6 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.hero, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: t.colors.primary, fontFamily: t.fonts.headingExtra, fontSize: 21, lineHeight: 30.45, letterSpacing: -0.21 },
  demo: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: t.colors.soft, flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoText: { color: t.colors.ink, fontFamily: t.fonts.bold, fontSize: 13, lineHeight: 18.85 },
  scroll: { flex: 1 }, body: { paddingHorizontal: 16, paddingBottom: 24 },
  hero: { backgroundColor: t.colors.hero, borderRadius: 24, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 24, marginTop: 8, overflow: 'hidden' },
  decoration: { position: 'absolute', right: -30, top: -26, opacity: 0.22 },
  label: { fontFamily: t.fonts.extra, fontSize: 12, lineHeight: 17.4, letterSpacing: 0.84, textTransform: 'uppercase', color: t.colors.muted },
  heroLabel: { color: t.colors.accent }, title: { fontFamily: t.fonts.headingExtra, fontSize: 30, lineHeight: 32.4, letterSpacing: -0.3, color: t.colors.heroText, maxWidth: 290, marginTop: 8, marginBottom: 10 },
  heroDescription: { fontFamily: t.fonts.body, fontSize: 15, lineHeight: 21.75, color: t.colors.heroMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  action: { flex: 1, minWidth: 0, minHeight: 104, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.cardBorder, borderRadius: 20, padding: 16, gap: 10, alignItems: 'flex-start' },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.mint, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { alignSelf: 'stretch', minWidth: 0 },
  actionTitle: { flexShrink: 1, color: t.colors.ink, fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 21.75 },
  caption: { color: t.colors.muted, fontFamily: t.fonts.body, fontSize: 13, lineHeight: 18.85 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontFamily: t.fonts.heading, fontSize: 18, lineHeight: 26.1, letterSpacing: -0.18, color: t.colors.ink, flexShrink: 1 },
  link: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  linkText: { color: t.colors.good, fontFamily: t.fonts.bold, fontSize: 14, lineHeight: 20.3, textDecorationLine: 'underline' },
  list: { paddingHorizontal: 0, paddingVertical: 4, overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.separator },
  tile: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: t.fonts.extra, fontSize: 15, lineHeight: 21.75 },
  product: { flex: 1, minWidth: 0 }, productName: { fontFamily: t.fonts.bold, color: t.colors.ink, fontSize: 15, lineHeight: 21.75 },
  empty: { fontFamily: t.fonts.body, color: t.colors.muted, fontSize: 14, lineHeight: 20.3 },
  legend: { marginTop: 12 }, legendRows: { marginTop: 10, gap: 8 }, legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendText: { flex: 1, fontFamily: t.fonts.semibold, color: t.colors.ink, fontSize: 15, lineHeight: 21.75 },
  footnote: { marginTop: 12, color: t.colors.muted, fontFamily: t.fonts.body, fontSize: 13, lineHeight: 18.85 },
  dock: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: t.colors.ground },
  scan: { minHeight: 62, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, backgroundColor: t.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanText: { fontFamily: t.fonts.bold, color: t.colors.onPrimary, fontSize: 18, lineHeight: 26.1, flexShrink: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  appearance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  appearanceLabel: { flex: 1, fontFamily: t.fonts.extra, fontSize: 13, letterSpacing: 0.91, textTransform: 'uppercase', color: t.colors.muted },
  appearanceButtons: { flexDirection: 'row', gap: 4 },
  iconHit: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  themeVisual: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { gap: 8, paddingBottom: 12 },
  modal: { flex: 1, backgroundColor: t.colors.scrim, alignItems: 'center', justifyContent: 'flex-end' },
  dismiss: { flex: 1, width: '100%' }, sheet: { width: '100%', maxWidth: 430, maxHeight: '85%', gap: 8 }, demoOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
