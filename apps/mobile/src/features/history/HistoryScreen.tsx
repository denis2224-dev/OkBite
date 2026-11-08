import { spacing } from '../../theme/tokens';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { HomeCard, HomeChip, HomeIcon, HomePressable } from '../../shared/HomeChrome';
import { router, useFocusEffect } from 'expo-router';
import { Body, Button, Card, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { roDate } from '../product/SourceCard';
import { displayScore } from '../product/displayScore';
import { clearHistory, listHistory, type HistoryEntry } from './store';
import { subscribeQueue } from '../offline/queue';

const copy = ro.history.design;
export function HistoryScreen() {
  const t = useHomeTheme();
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

  async function confirmClear() {
    if (clearPending.current) return;
    clearPending.current = true;
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
      <TabPageHeader title={copy.title} subtitle={copy.note} action={entries.length > 0 ? <HomePressable label={ro.history.clear} disabled={clearing} onPress={() => setConfirming(true)} style={styles.clear}><HomeIcon name="trash" size={18} color={t.colors.low}/><Text style={styles.clearText}>{ro.history.clear}</Text></HomePressable> : undefined}/>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
        {error && <Card><Body accessibilityRole="alert">{error === 'load' ? ro.history.loadError : ro.history.clearError}</Body>{error === 'load' && <Button variant="secondary" onPress={() => void load()}>{ro.app.retry}</Button>}</Card>}
        {!loading && !error && entries.length === 0 && <View style={styles.empty}>
          <View style={styles.emptyIcon}><HomeIcon name="clock" size={30} color={t.colors.primary}/></View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>{copy.emptyTitle}</Text><Text style={styles.emptyText}>{copy.empty}</Text>
          <Button onPress={() => router.push('/scan')}>{copy.scan}</Button>
        </View>}
        {entries.length > 0 && <HomeCard accessibilityRole="list" accessibilityLabel={ro.history.title} style={styles.list}>
          {entries.map(({product,score:storedScore,savedAt}, index) => {
            const score=displayScore(product,storedScore);
            const grade=score.grade==='unavailable'?'neutral':score.grade;
            return <HomePressable key={product.id} label={ro.history.open(product.name)} onPress={() => router.push({pathname:'/product/[id]',params:{id:product.id,cached:'1'}})} style={[styles.row,index>0&&styles.separator]}>
              <View style={[styles.tile,{backgroundColor:t.colors.neutralBg}]}><Text style={styles.initials}>{product.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('ro')}</Text></View>
              <View style={styles.product}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{product.brand} · {new Date(savedAt).toLocaleDateString('ro-RO')}</Text><Text style={styles.meta}>{product.source}</Text><Text style={styles.meta}>{ro.result.added}: {roDate(product.addedAt)}</Text>{score.score === null && <Text style={styles.meta}>{ro.result.scoreUnavailable}</Text>}</View>
              <HomeChip background={t.colors[`${grade}Bg`]} color={t.colors[grade]}>{score.score===null?'—':String(score.score)}</HomeChip>
            </HomePressable>;
          })}
        </HomeCard>}
        {confirming && <Card><Heading style={{fontSize:20,lineHeight:27}}>{ro.history.clearTitle}</Heading><Body>{ro.history.clearBody}</Body><Button disabled={clearing} onPress={() => void confirmClear()}>{ro.history.clearConfirm}</Button><Button variant="secondary" disabled={clearing} onPress={() => {setConfirming(false);setError(null);}}>{ro.app.cancel}</Button></Card>}
        <Button variant="ghost" onPress={() => router.push('/offline')}>{ro.offline.queueTitle}</Button>
      </ScrollView>
    </View>
  </SafeAreaView>;
}
const createStyles=(t:HomeTheme)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:t.colors.ground},frame:{flex:1,width:'100%',maxWidth:430,alignSelf:'center'},
 header:{minHeight:64,paddingTop:spacing.headerTop,paddingHorizontal:16,paddingBottom:8,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 title:{flex:1,fontFamily:t.fonts.heading,fontSize:22,lineHeight:31.9,letterSpacing:-0.22,color:t.colors.ink},
 clear:{minHeight:44,paddingVertical:4,paddingHorizontal:12,borderRadius:999,backgroundColor:t.colors.lowBg,flexDirection:'row',alignItems:'center',gap:6},clearText:{fontFamily:t.fonts.bold,fontSize:13,lineHeight:18.85,color:t.colors.low,flexShrink:1},
 body:{paddingHorizontal:16,paddingBottom:24,gap:12},note:{fontFamily:t.fonts.body,fontSize:13,lineHeight:18.85,color:t.colors.muted,marginBottom:0},
 empty:{paddingVertical:56,paddingHorizontal:16,alignItems:'stretch'},emptyIcon:{width:72,height:72,borderRadius:36,alignSelf:'center',backgroundColor:t.colors.mint,alignItems:'center',justifyContent:'center',marginBottom:14},
 emptyTitle:{fontFamily:t.fonts.heading,fontSize:21,lineHeight:30.45,letterSpacing:-0.21,color:t.colors.ink,textAlign:'center',marginBottom:6},
 emptyText:{fontFamily:t.fonts.body,fontSize:14,lineHeight:20.3,color:t.colors.muted,textAlign:'center',marginBottom:18},
 list:{paddingVertical:4,paddingHorizontal:0,overflow:'hidden'},row:{minHeight:68,paddingVertical:10,paddingHorizontal:14,gap:12,flexDirection:'row',alignItems:'center'},separator:{borderTopWidth:1,borderTopColor:t.colors.separator},
 tile:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center'},initials:{fontFamily:t.fonts.extra,fontSize:15,lineHeight:21.75,color:t.colors.ink},product:{flex:1,minWidth:0},
 name:{fontFamily:t.fonts.bold,fontSize:15,lineHeight:21.75,color:t.colors.ink},meta:{fontFamily:t.fonts.body,fontSize:13,lineHeight:18.85,color:t.colors.muted},
});
