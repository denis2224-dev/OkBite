import { spacing } from '../../theme/tokens';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { HomeCard, HomeChip, HomeIcon, HomePressable } from '../../shared/HomeChrome';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { roDate } from '../product/SourceCard';
import { displayScore } from '../product/displayScore';
import { clearHistory, listHistory, removeFromHistory, restoreToHistory, type HistoryEntry } from './store';
import { subscribeQueue } from '../offline/queue';
import { useToast } from '../../ui/Toast';
import { historyTier } from './tierLabel';
import { showStorageWarning } from '../../lib/storagePersistence';

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
      toast(ro.history.removed, { label: ro.history.undo, onPress: () => {
        if (mutation.current !== revision) return;
        void restoreToHistory(entry).then(() => { if (focused.current) void load(); }).catch(() => toast(ro.history.removeError));
      } });
    } catch { toast(ro.history.removeError); }
    finally { clearPending.current = false; if (focused.current) setClearing(false); }
  }

  async function confirmClear() {
    if (clearPending.current) return;
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
      if (focused.current) setError('clear');
    } finally {
      clearPending.current = false;
      if (focused.current) setClearing(false);
    }
  }

  return <SafeAreaView edges={['top','left','right']} style={styles.safe}>
    <View style={styles.frame}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
        {entries.length > 0 && <HomePressable label={ro.history.clear} disabled={clearing} onPress={() => setConfirming(true)} style={styles.clear}><HomeIcon name="trash" size={18} color={t.colors.low}/><Text style={styles.clearText}>{ro.history.clear}</Text></HomePressable>}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>{copy.note}</Text>
        <TextInput accessibilityLabel={ro.history.search} placeholder={ro.history.search} placeholderTextColor={t.colors.muted} value={query} onChangeText={setQuery} style={styles.search}/>
        {showStorageWarning ? <Card><Body>{ro.pwa.storageWarning}</Body></Card> : null}
        {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
        {error && !confirming && <Card><Body accessibilityRole="alert">{error === 'load' ? ro.history.loadError : ro.history.clearError}</Body>{error === 'load' && <Button variant="secondary" onPress={() => void load()}>{ro.app.retry}</Button>}</Card>}
        {!loading && !error && entries.length === 0 && <View style={styles.empty}>
          <View style={styles.emptyIcon}><HomeIcon name="clock" size={30} color={t.colors.primary}/></View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>{copy.emptyTitle}</Text><Text style={styles.emptyText}>{copy.empty}</Text>
          <Button onPress={() => router.push('/scan')}>{copy.scan}</Button>
        </View>}
        {!loading && !error && entries.length > 0 && visible.length === 0 && <Body>{ro.history.noMatches}</Body>}
        {visible.length > 0 && <View accessibilityRole="list" accessibilityLabel={ro.history.title} style={styles.list}>
          {visible.map(entry => {
            const {product,score:storedScore,savedAt}=entry;
            const score=displayScore(product,storedScore);
            const tier = score.score === null ? null : historyTier(score.score);
            const grade = tier === null ? 'neutral' : tier === 'excellent' || tier === 'good' ? 'good' : tier === 'fair' ? 'medium' : 'low';
            const verification = product.status === 'verified' && product.verifiedAt
              ? `${ro.result.checked}: ${roDate(product.verifiedAt)}` : ro.result.unverified;
            const scoreLabel = score.score === null ? ro.result.scoreUnavailable : `${ro.history.score(score.score)} · ${tier ? ro.tiers[tier] : ''}`;
            const label = [ro.history.open(product.name), product.brand, scoreLabel, ro.score.disclaimer, product.source, `${ro.result.added}: ${roDate(product.addedAt)}`, verification, ro.history.savedAt(roDate(savedAt.slice(0,10)))].join('. ');
            return <HomeCard key={product.id} style={styles.historyCard}><HomePressable label={label} disabled={clearing} onLongPress={() => void remove(entry)} onPress={() => router.push({pathname:'/product/[id]',params:{id:product.id,cached:'1'}})} style={styles.row}>
              <View style={[styles.tile,{backgroundColor:t.colors.neutralBg}]}>{product.imageUrl ? <Image testID="history-thumbnail" source={{uri:product.imageUrl}} resizeMode="cover" accessible={false} style={styles.thumbnail}/> : <Text style={styles.initials}>{product.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('ro')}</Text>}</View>
              <View style={styles.product}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{product.brand} · {new Date(savedAt).toLocaleDateString('ro-RO')}</Text><Text style={styles.meta}>{product.source}</Text><Text style={styles.meta}>{ro.result.added}: {roDate(product.addedAt)}</Text><Text style={styles.meta}>{verification}</Text><Text style={styles.meta}>{ro.score.disclaimer}</Text>{score.score === null && <Text style={styles.meta}>{ro.result.scoreUnavailable}</Text>}</View>
              <HomeChip background={t.colors[`${grade}Bg`]} color={t.colors[grade]}>{score.score===null?'—':`${score.score} · ${tier ? ro.tiers[tier] : ''}`}</HomeChip>
            </HomePressable><HomePressable label={ro.history.remove(product.name)} disabled={clearing} onPress={() => void remove(entry)} style={styles.delete}><HomeIcon name="trash" size={20} color={t.colors.low}/></HomePressable></HomeCard>;
          })}
        </View>}
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
 header:{minHeight:64,paddingTop:spacing.headerTop,paddingHorizontal:16,paddingBottom:8,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 title:{flex:1,fontFamily:t.fonts.heading,fontSize:32,lineHeight:44,letterSpacing:-0.22,color:t.colors.ink},
 clear:{minHeight:44,paddingVertical:4,paddingHorizontal:12,borderRadius:999,backgroundColor:t.colors.lowBg,flexDirection:'row',alignItems:'center',gap:6},clearText:{fontFamily:t.fonts.bold,fontSize:13,lineHeight:18.85,color:t.colors.low,flexShrink:1},
 body:{paddingHorizontal:16,paddingBottom:24,gap:12},note:{fontFamily:t.fonts.body,fontSize:13,lineHeight:18.85,color:t.colors.muted,marginBottom:0},
 empty:{paddingVertical:56,paddingHorizontal:16,alignItems:'stretch'},emptyIcon:{width:72,height:72,borderRadius:36,alignSelf:'center',backgroundColor:t.colors.mint,alignItems:'center',justifyContent:'center',marginBottom:14},
 emptyTitle:{fontFamily:t.fonts.heading,fontSize:21,lineHeight:30.45,letterSpacing:-0.21,color:t.colors.ink,textAlign:'center',marginBottom:6},
 emptyText:{fontFamily:t.fonts.body,fontSize:14,lineHeight:20.3,color:t.colors.muted,textAlign:'center',marginBottom:18},
 search:{minHeight:48,padding:12,borderWidth:1,borderColor:t.colors.border,borderRadius:14,color:t.colors.ink,fontFamily:t.fonts.body,fontSize:16},
 historyCard:{padding:0},delete:{minHeight:48,padding:12,alignSelf:'flex-end'},thumbnail:{width:48,height:48,borderRadius:14},
 list:{gap:12},row:{minHeight:68,paddingVertical:10,paddingHorizontal:14,gap:12,flexDirection:'row',flexWrap:'wrap',alignItems:'center'},
 tile:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center'},initials:{fontFamily:t.fonts.extra,fontSize:15,lineHeight:21.75,color:t.colors.ink},product:{flex:1,minWidth:130},
 name:{fontFamily:t.fonts.bold,fontSize:15,lineHeight:21.75,color:t.colors.ink},meta:{fontFamily:t.fonts.body,fontSize:13,lineHeight:18.85,color:t.colors.muted},
});
