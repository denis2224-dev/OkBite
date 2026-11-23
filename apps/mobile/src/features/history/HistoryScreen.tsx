import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { HomeIcon, HomePressable } from '../../shared/HomeChrome';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card } from '../../ui';
import { ro } from '../../copy/ro';
import { roDate } from '../product/SourceCard';
import { listHistory, removeFromHistory, restoreToHistory, subscribeHistory, type HistoryEntry } from './store';
import { subscribeQueue } from '../offline/queue';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { useToast } from '../../ui/Toast';
import { productScoreFor } from '../product/productScoreFor';
import { savedWhen } from './when';
import { HistoryRow } from './HistoryRow';
import { SwipeToDelete } from './SwipeToDelete';
import { TopProductsLink } from './TopProductsLink';
import { displayScore } from '../product/displayScore';

export function HistoryScreen() {
  const t = useHomeTheme();
  const copy = ro.history.design;
  const toast = useToast();
  const mutation = useRef(0);
  const styles = useMemo(() => createStyles(t), [t]);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'load' | null>(null);
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
    const refresh = () => { void load(); };
    const stopHistory = subscribeHistory(refresh);
    const stopQueue = subscribeQueue(refresh);
    void load();
    return () => {
      focused.current = false;
      generation.current++;
      stopHistory();
      stopQueue();
    };
  }, [load]));

  const visible = useMemo(() => [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [entries]);

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

  return <SafeAreaView edges={['top','left','right']} style={styles.safe}>
    <View style={styles.frame}>
      <TabPageHeader title={copy.title} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TopProductsLink />
        {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
        {error && <Card><Body accessibilityRole="alert">{ro.history.loadError}</Body><Button variant="secondary" onPress={() => void load()}>{ro.app.retry}</Button></Card>}
        {!loading && !error && entries.length === 0 && <View style={styles.empty}>
          <View style={styles.emptyIcon}><HomeIcon name="clock" size={30} color={t.colors.primary}/></View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>{copy.emptyTitle}</Text><Text style={styles.emptyText}>{copy.empty}</Text>
          <Button onPress={() => router.push('/scan')}>{copy.scan}</Button>
        </View>}
        {visible.length > 0 && <View testID="history-list" accessibilityRole="list" accessibilityLabel={ro.history.title} style={styles.list}>
          {/* One white card per product: photo, rating, verdict. Name, source, dates and status are read aloud. */}
          {visible.map(entry => {
            const { product, score: storedScore, savedAt } = entry;
            const { score: value, tier } = productScoreFor(product, storedScore);
            // Water has no 0-100 score: it shows an estimated range, or says the score is unavailable.
            const isWater = product.category.scoreKind === 'water';
            const range = isWater ? displayScore(product, storedScore).range : undefined;
            const disclaimer = isWater ? ro.result.water.disclaimer : ro.score.disclaimer;
            const verification = product.status === 'verified' && product.verifiedAt
              ? `${ro.result.checked}: ${roDate(product.verifiedAt)}` : ro.result.unverified;
            const scoreLabel = range ? ro.result.water.estimatedRange(range.min, range.max)
              : value === null || !tier ? ro.result.scoreUnavailable : `${ro.history.score(value)} · ${ro.tiers[tier]}`;
            const label = [ro.history.open(product.name), product.brand, scoreLabel, disclaimer, product.source, `${ro.result.added}: ${roDate(product.addedAt)}`, verification, savedWhen(savedAt)].join('. ');
            const unavailable = range ? ro.result.water.rangeChip(range.min, range.max) : isWater ? ro.result.scoreUnavailable : ro.history.noScore;
            return <SwipeToDelete key={product.id} label={ro.history.remove(product.name)} text={ro.history.swipeDelete} disabled={clearing} onDelete={() => void remove(entry)}>
            <HomePressable label={label} disabled={clearing}
              accessibilityActions={[{ name: 'delete', label: ro.history.remove(product.name) }]}
              onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') void remove(entry); }}
              onLongPress={() => void remove(entry)} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id, cached: '1' } })}
              style={styles.row}>
              <HistoryRow imageUrl={product.imageUrl} score={range ? null : value} tier={range ? null : tier} unavailableText={unavailable} />
            </HomePressable>
            </SwipeToDelete>;
          })}
        </View>}
        <Button variant="ghost" onPress={() => router.push('/offline')}>{ro.offline.queueTitle}</Button>
      </ScrollView>
    </View>
  </SafeAreaView>;
}
const createStyles=(t:HomeTheme)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:t.colors.ground},frame:{flex:1,width:'100%',maxWidth:430,alignSelf:'center'},
 body:{paddingHorizontal:16,paddingBottom:24,gap:12},
 empty:{paddingVertical:56,paddingHorizontal:16,alignItems:'stretch'},emptyIcon:{width:72,height:72,borderRadius:36,alignSelf:'center',backgroundColor:t.colors.mint,alignItems:'center',justifyContent:'center',marginBottom:14},
 emptyTitle:{fontFamily:t.fonts.heading,fontSize:21,lineHeight:30.45,letterSpacing:-0.21,color:t.colors.ink,textAlign:'center',marginBottom:6},
 emptyText:{fontFamily:t.fonts.body,fontSize:14,lineHeight:20.3,color:t.colors.muted,textAlign:'center',marginBottom:18},
  list:{gap:10},row:{minHeight:88,padding:10,borderRadius:20,backgroundColor:t.colors.surface,flexDirection:'row',alignItems:'center'},
 });
