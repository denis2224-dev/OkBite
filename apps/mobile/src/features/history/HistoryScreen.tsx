import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { HomeIcon, HomePressable } from '../../shared/HomeChrome';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Caption, Card, Heading, ListRow, SearchPill, SoftCard } from '../../ui';
import { ro } from '../../copy/ro';
import { roDate } from '../product/SourceCard';
import { clearHistory, listHistory, removeFromHistory, restoreToHistory, type HistoryEntry } from './store';
import { subscribeQueue } from '../offline/queue';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { useToast } from '../../ui/Toast';
import { productScoreFor } from '../product/productScoreFor';
import { savedWhen } from './when';
import { summarizeBasket } from './basket';
import { BasketCard } from './BasketCard';
import { displayScore } from '../product/displayScore';

export function HistoryScreen() {
  const t = useHomeTheme();
  const copy = ro.history.design;
  const toast = useToast();
  const [query, setQuery] = useState('');
  const mutation = useRef(0);
  const styles = useMemo(() => createStyles(t), [t]);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'load' | 'clear' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const focused = useRef(false);
  const generation = useRef(0);
  const clearPending = useRef(false);
  const refreshPending = useRef(false);

  const load = useCallback(async (preserveError = false) => {
    if (clearPending.current) { refreshPending.current = true; return; }
    const request = ++generation.current;
    setLoading(true);
    if (!preserveError) setError(null);
    try {
      const rows = await listHistory();
      if (focused.current && generation.current === request) setEntries(rows);
    } catch {
      if (!preserveError && focused.current && generation.current === request) setError('load');
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

  const basket = useMemo(() => summarizeBasket(entries), [entries]);
  const visible = entries.filter(({ product }) => `${product.name} ${product.brand}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  async function remove(entry: HistoryEntry) {
    if (clearPending.current) return;
    clearPending.current = true;
    const revision = ++mutation.current;
    generation.current++;
    setClearing(true);
    setLoading(false);
    try {
      await removeFromHistory(entry.product.id);
      if (focused.current) setEntries(rows => rows.filter(row => row.product.id !== entry.product.id));
      const undo = () => {
        if (mutation.current !== revision) return;
        void restoreToHistory(entry).then(() => { if (focused.current) void load(); }).catch(() => {
          if (mutation.current === revision) toast(ro.history.restoreError, { label: ro.history.undo, onPress: undo });
        });
      };
      toast(ro.history.removed, { label: ro.history.undo, onPress: undo });
    } catch { toast(ro.history.removeError); }
    finally { finishMutation(); }
  }

  function finishMutation(preserveError = false) {
    clearPending.current = false;
    if (focused.current) setClearing(false);
    if (refreshPending.current) { refreshPending.current = false; if (focused.current) void load(preserveError); }
  }

  async function confirmClear() {
    if (clearPending.current) return;
    let failed = false;
    clearPending.current = true;
    mutation.current++;
    generation.current++;
    setLoading(false);
    setClearing(true);
    setError(null);
    try {
      await clearHistory();
      if (focused.current) { setEntries([]); setConfirming(false); }
    } catch {
      failed = true;
      if (focused.current) setError('clear');
    } finally {
      finishMutation(failed);
    }
  }

  return <SafeAreaView edges={['top','left','right']} style={styles.safe}>
    <View style={styles.frame}>
      <TabPageHeader title={copy.title} action={entries.length > 0 ? <HomePressable label={ro.history.clear} disabled={clearing} onPress={() => setConfirming(true)} style={styles.clear}><HomeIcon name="trash" size={18} color={t.colors.dangerText}/><Text style={styles.clearText}>{ro.history.clear}</Text></HomePressable> : null} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!loading && !error && basket && <BasketCard basket={basket} />}
        {entries.length > 0 && <SearchPill testID="history-search" placeholder={ro.history.search} value={query} onChangeText={setQuery} />}
        {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
        {error && !confirming && <Card><Body accessibilityRole="alert">{error === 'load' ? ro.history.loadError : ro.history.clearError}</Body>{error === 'load' && <Button variant="secondary" onPress={() => void load()}>{ro.app.retry}</Button>}</Card>}
        {!loading && !error && entries.length === 0 && <View style={styles.empty}>
          <View style={styles.emptyIcon}><HomeIcon name="clock" size={30} color={t.colors.primary}/></View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>{copy.emptyTitle}</Text><Text style={styles.emptyText}>{copy.empty}</Text>
          <Button onPress={() => router.push('/scan')}>{copy.scan}</Button>
        </View>}
        {!loading && !error && entries.length > 0 && visible.length === 0 && <Body>{ro.history.noMatches}</Body>}
        {visible.length > 0 && <>
          {/* One soft card of grade rows. Time, source, dates and status are read aloud, not shown. */}
          <SoftCard testID="history-list" accessibilityRole="list" accessibilityLabel={ro.history.title} style={styles.list}>
            {visible.map((entry, index) => {
              const {product,score:storedScore,savedAt}=entry;
              const { score: value, tier } = productScoreFor(product, storedScore);
              const isWater = product.category.scoreKind === 'water';
              const assessed = isWater ? displayScore(product, storedScore) : null;
              const range = assessed?.range;
              const disclaimer = isWater ? ro.result.water.disclaimer : ro.score.disclaimer;
              const verification = product.status === 'verified' && product.verifiedAt
                ? `${ro.result.checked}: ${roDate(product.verifiedAt)}` : ro.result.unverified;
              const scoreLabel = range ? ro.result.water.estimatedRange(range.min, range.max)
                : value === null || !tier ? ro.result.scoreUnavailable : `${ro.history.score(value)} · ${ro.tiers[tier]}`;
              const when = savedWhen(savedAt);
              const label = [ro.history.open(product.name), product.brand, scoreLabel, disclaimer, product.source, `${ro.result.added}: ${roDate(product.addedAt)}`, verification, when].join('. ');
              return <ListRow key={product.id} title={product.name} score={range ? null : value} tier={range ? null : tier}
                note={range ? ro.result.water.rangeChip(range.min, range.max) : isWater && (value === null || !tier) ? ro.result.scoreUnavailable : undefined} label={label} first={index === 0} disabled={clearing}
                accessibilityActions={[{ name: 'delete', label: ro.history.remove(product.name) }]}
                onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') void remove(entry); }}
                onLongPress={() => void remove(entry)} onPress={() => router.push({pathname:'/product/[id]',params:{id:product.id,cached:'1'}})} />;
            })}
          </SoftCard>
          {visible.some(({ product }) => product.category.scoreKind !== 'water') && <Caption style={{ textAlign: 'center' }}>{ro.score.disclaimer}</Caption>}
          {visible.some(({ product }) => product.category.scoreKind === 'water') && <Caption style={{ textAlign: 'center' }}>{ro.result.water.disclaimer}</Caption>}
        </>}
        <Button variant="ghost" onPress={() => router.push('/offline')}>{ro.offline.queueTitle}</Button>
      </ScrollView>
    </View>
    <Modal visible={confirming} transparent animationType="none" onRequestClose={() => { if (!clearing) { setConfirming(false); setError(null); } }}>
      <SafeAreaView edges={['top','bottom','left','right']} style={styles.confirmation}>
        <ScrollView contentContainerStyle={styles.confirmationContent}>
          <Card accessibilityLabel={ro.history.clearTitle} accessibilityViewIsModal>
            <Heading style={{fontSize:20,lineHeight:27}}>{ro.history.clearTitle}</Heading><Body>{ro.history.clearBody}</Body>
            {error === 'clear' && <Body accessibilityLiveRegion="polite">{ro.history.clearError}</Body>}
            <Button disabled={clearing} onPress={() => void confirmClear()}>{ro.history.clearConfirm}</Button><Button variant="secondary" disabled={clearing} onPress={() => {setConfirming(false);setError(null);}}>{ro.app.cancel}</Button>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const createStyles=(t:HomeTheme)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:t.colors.ground},frame:{flex:1,width:'100%',maxWidth:430,alignSelf:'center'},
 confirmation:{flex:1,backgroundColor:t.colors.scrim},confirmationContent:{flexGrow:1,justifyContent:'center',padding:16,width:'100%',maxWidth:430,alignSelf:'center'},
 clear:{minHeight:44,paddingVertical:4,paddingHorizontal:12,borderRadius:999,backgroundColor:t.colors.dangerBg,flexDirection:'row',alignItems:'center',gap:6},clearText:{fontFamily:t.fonts.bold,fontSize:13,lineHeight:18.85,color:t.colors.dangerText,flexShrink:1},
 body:{paddingHorizontal:22,paddingBottom:24,gap:20},
 empty:{paddingVertical:56,paddingHorizontal:16,alignItems:'stretch'},emptyIcon:{width:72,height:72,borderRadius:36,alignSelf:'center',backgroundColor:t.colors.mint,alignItems:'center',justifyContent:'center',marginBottom:14},
 emptyTitle:{fontFamily:t.fonts.heading,fontSize:21,lineHeight:30.45,letterSpacing:-0.21,color:t.colors.ink,textAlign:'center',marginBottom:6},
 emptyText:{fontFamily:t.fonts.body,fontSize:14,lineHeight:20.3,color:t.colors.muted,textAlign:'center',marginBottom:18},
 search:{minHeight:48,padding:12,borderWidth:1,borderColor:t.colors.border,borderRadius:14,color:t.colors.ink,fontFamily:t.fonts.body,fontSize:16},
 list:{paddingVertical:4,gap:0},row:{minHeight:64,paddingVertical:10,gap:14,flexDirection:'row',alignItems:'center'},
 noScore:{minWidth:56,paddingVertical:7,paddingHorizontal:8,borderRadius:9,backgroundColor:t.colors.soft,alignItems:'center'},noScoreText:{fontFamily:t.fonts.bold,fontSize:12,lineHeight:16,color:t.colors.muted},product:{flex:1,minWidth:0},
 name:{fontFamily:t.fonts.bold,fontSize:15,lineHeight:21.75,color:t.colors.ink},meta:{fontFamily:t.fonts.body,fontSize:13,lineHeight:18.85,color:t.colors.muted},
});
