import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { listHistory, type HistoryEntry } from '../history/store';
import { useProfile } from '../profile';
import { RecentScanRow } from './RecentScanRow';

const LIMIT = 3;

/** Light sheet under the camera with the newest history products. Reloads each time the Scan tab is focused. */
export function RecentScans({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let live = true;
    listHistory().then(rows => {
      if (!live) return;
      setEntries([...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, LIMIT));
      setFailed(false);
    }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [active]);

  const muted = [styles.note, { color: colors.muted }];
  return <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
    <View style={[styles.grabber, { backgroundColor: colors.border }]} />
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{ro.home.design.recent}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={ro.home.allHistory} onPress={() => router.navigate('/history')} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.ink }]}>{ro.scan.seeAll}</Text>
      </Pressable>
    </View>
    {failed ? <Text accessibilityRole="alert" style={muted}>{ro.history.loadError}</Text>
      : entries?.length === 0 ? <Text style={muted}>{ro.home.design.empty}</Text>
        : entries ? <>
          <View accessibilityRole="list">
            {entries.map((entry, index) => <RecentScanRow key={entry.product.id} entry={entry} watched={profile.allergens} last={index === entries.length - 1} />)}
          </View>
          <Text style={muted}>{ro.score.disclaimer}</Text>
        </> : null}
  </View>;
}

const styles = StyleSheet.create({
  // Bottom padding leaves room for the bar's raised Scan circle.
  sheet: { flexGrow: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 48, gap: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 8 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 27, flexShrink: 1 },
  link: { justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingVertical: 8 },
});
