import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { SoftCard } from '../../ui/SoftCard';
import { listHistory, subscribeHistory, type HistoryEntry } from '../history/store';
import { useProfile } from '../profile';
import { RecentScanRow } from './RecentScanRow';
import { ShelfPicks } from '../shelf/ShelfPicks';

const LIMIT = 3;

/** Shelf picks, then the newest history products in one soft card. Refreshes while active after history changes. */
export function RecentScans({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let revision = 0;
    function load() {
      const request = ++revision;
      void listHistory().then(rows => {
        if (request !== revision) return;
        setEntries([...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, LIMIT));
        setFailed(false);
      }).catch(() => { if (request === revision) setFailed(true); });
    }
    const unsubscribe = subscribeHistory(load);
    load();
    return () => {
      revision++;
      unsubscribe();
    };
  }, [active]);

  const note = [styles.note, { color: colors.textSecondary }];
  return <View style={styles.column}>
    <ShelfPicks />
    <SoftCard testID="recent-card" style={styles.card}>
      {failed ? <Text accessibilityRole="alert" style={note}>{ro.history.loadError}</Text>
        : entries?.length === 0 ? <Text style={note}>{ro.home.design.empty}</Text>
          : entries ? <View accessibilityRole="list">
            {entries.map((entry, index) => <RecentScanRow key={entry.product.id} entry={entry} watched={profile.allergens} first={index === 0} />)}
          </View> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={ro.home.allHistory} onPress={() => router.navigate('/history')} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primary }]}>{ro.scan.seeAll}</Text>
      </Pressable>
    </SoftCard>
  </View>;
}

const styles = StyleSheet.create({
  column: { gap: 20 },
  card: { paddingVertical: 8 },
  note: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, paddingVertical: 12 },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
});
