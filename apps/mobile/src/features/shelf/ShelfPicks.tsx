import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { Button } from '../../ui/Button';
import { useTheme } from '../../theme/useTheme';
import { fonts, typeScale } from '../../theme/tokens';
import { homeTheme } from '../../theme/home';
import { shelves, type ShelfSlug } from './shelves';
import { ShelfIcon } from './ShelfIcon';
import { ShelfPickRow } from './ShelfPickRow';
import { useTopProducts } from './useTopProducts';

/** 0 to 1 once per `key`; stays at 1 when motion is reduced or the check is missing or fails (same rule as ScoreTag). */
function useRiseIn(key: string): Animated.Value {
  const [rise] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let live = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(reduced => {
      if (!live || reduced !== false) return;
      rise.setValue(0);
      Animated.timing(rise, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }).catch(() => undefined);
    return () => { live = false; };
  }, [key, rise]);
  return rise;
}

/** "Cel mai bun din raft": pick a shelf, see its three best verified products by OkBite score. */
export function ShelfPicks() {
  const { colors } = useTheme();
  const [slug, setSlug] = useState<ShelfSlug>(shelves[0]!.slug);
  const { status, picks, retry } = useTopProducts(slug);
  const rise = useRiseIn(slug);
  const name = ro.scan.shelf.names[slug];
  const muted = [styles.note, { color: colors.muted }];
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{ro.scan.shelf.title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.shelves} keyboardShouldPersistTaps="handled">
      {shelves.map((shelf, index) => {
        const tile = homeTheme.tiles[index % homeTheme.tiles.length]!;
        const selected = shelf.slug === slug;
        return <Pressable key={shelf.slug} accessibilityRole="button" accessibilityLabel={ro.scan.shelf.names[shelf.slug]} accessibilityState={{ selected }}
          onPress={() => setSlug(shelf.slug)} style={styles.shelf}>
          <View style={[styles.circle, { backgroundColor: tile.background, borderColor: selected ? colors.primary : tile.background }]}>
            <ShelfIcon name={shelf.icon} color={tile.foreground} />
          </View>
          <Text style={[styles.shelfName, { color: colors.ink }]}>{ro.scan.shelf.names[shelf.slug]}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.top, { color: colors.ink }]}>{ro.scan.shelf.top(name)}</Text>
      {status === 'ready' && picks.length ? <Text style={muted}>{ro.scan.shelf.count(picks.length)}</Text> : null}
    </View>
    <Animated.View style={[styles.list, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {status === 'loading' ? <View accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading} style={styles.list}>
        {[0, 1, 2].map(row => <View key={row} style={[styles.placeholder, { backgroundColor: colors.sageSoft }]} />)}
      </View>
        : status === 'error' ? <View style={styles.message}>
          <Text accessibilityRole="alert" style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.error}</Text>
          <Button variant="secondary" onPress={retry} style={styles.retry}>{ro.errors.retry}</Button>
        </View>
          : picks.length === 0 ? <View style={styles.message}>
            <Text style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.empty}</Text>
            <Text style={muted}>{ro.scan.shelf.emptyHint}</Text>
          </View>
            : <>
              <View accessibilityRole="list" style={styles.list}>
                {picks.map((pick, index) => <ShelfPickRow key={pick.product.id} pick={pick} best={index === 0} />)}
              </View>
              <View>
                <Text style={muted}>{ro.score.disclaimer}</Text>
                <Text style={muted}>{ro.scan.shelf.ranking}</Text>
              </View>
            </>}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 10, paddingBottom: 12 },
  title: { fontFamily: fonts.heading, ...typeScale.title },
  // The strip runs to the sheet's edges (its 20 px side padding) so shelves scroll off-screen, not into a margin.
  strip: { marginHorizontal: -20 },
  shelves: { paddingHorizontal: 20, gap: 12, alignItems: 'flex-start' },
  shelf: { width: 84, alignItems: 'center', gap: 6, paddingVertical: 2 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shelfName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 8 },
  top: { fontFamily: fonts.heading, ...typeScale.section, flexShrink: 1 },
  list: { gap: 8 },
  placeholder: { minHeight: 64, borderRadius: 16 },
  message: { gap: 4, alignItems: 'flex-start', paddingVertical: 4 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  note: { fontFamily: fonts.body, ...typeScale.caption },
  retry: { marginTop: 4 },
});
