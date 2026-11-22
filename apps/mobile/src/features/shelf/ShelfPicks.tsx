import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, typeScale } from '../../theme/tokens';
import { SoftCard } from '../../ui/SoftCard';
import { SecondaryButton } from '../../ui/PillButtons';
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
  return <SoftCard testID="shelf-card">
    <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{ro.scan.shelf.title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.shelves} keyboardShouldPersistTaps="handled">
      {shelves.map((shelf, index) => {
        const tile = homeTheme.tiles[index % homeTheme.tiles.length]!;
        const selected = shelf.slug === slug;
        return <Pressable key={shelf.slug} accessibilityRole="button" accessibilityLabel={ro.scan.shelf.names[shelf.slug]} accessibilityState={{ selected }}
          onPress={() => setSlug(shelf.slug)} style={styles.shelf}>
          <View testID={`shelf-circle-${shelf.slug}`} style={[styles.circle, { backgroundColor: tile.background, borderColor: selected ? colors.primary : tile.background }]}>
            <ShelfIcon name={shelf.icon} color={tile.foreground} />
          </View>
          <Text style={[styles.shelfName, { color: colors.ink }]}>{ro.scan.shelf.names[shelf.slug]}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <Animated.View style={[styles.list, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {status === 'loading' ? <View accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading} style={styles.list}>
        {[0, 1, 2].map(row => <View key={row} style={[styles.placeholder, { backgroundColor: colors.track }]} />)}
      </View>
        : status === 'error' ? <View style={styles.message}>
          <Text accessibilityRole="alert" style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.error}</Text>
          <SecondaryButton label={ro.errors.retry} onPress={retry} />
        </View>
          : picks.length === 0 ? <View style={styles.message}>
            <Text style={[styles.body, { color: colors.ink }]}>{ro.scan.shelf.empty}</Text>
          </View>
            : <View accessibilityRole="list">
              {picks.map((pick, index) => <ShelfPickRow key={pick.product.id} pick={pick} best={index === 0} first={index === 0} />)}
            </View>}
    </Animated.View>
  </SoftCard>;
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, ...typeScale.title },
  // The strip runs to the card's edges (its 20 px padding) so shelves scroll off-screen, not into a margin.
  strip: { marginHorizontal: -20 },
  shelves: { paddingHorizontal: 20, gap: 12, alignItems: 'flex-start' },
  shelf: { width: 84, alignItems: 'center', gap: 6, paddingVertical: 2 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shelfName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  list: { gap: 8 },
  placeholder: { minHeight: 64, borderRadius: 16 },
  message: { gap: 12, paddingVertical: 4 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
});
