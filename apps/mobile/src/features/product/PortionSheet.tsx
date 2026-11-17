import { useMemo, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Button } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { softShadow } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { PortionTable } from './PortionTable';
import { shouldDismiss } from './sheetGesture';

/** Opened from the "Porție" button. Pull the handle down (or tap outside, or Închide) to close it. */
export function PortionSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const { colors } = useTheme();
  const [drag] = useState(() => new Animated.Value(0));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (shouldDismiss(g.dy, g.vy)) {
        Animated.timing(drag, { toValue: 800, duration: 180, useNativeDriver: true }).start(() => onClose());
      } else {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
  }), [drag, onClose]);

  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    {/* No dimming: the page stays fully visible behind the sheet; tapping it still closes the sheet. */}
    <View testID="portion-sheet-overlay" style={styles.overlay}>
      <Pressable testID="portion-sheet-backdrop" accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View testID="portion-sheet" accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.ground, borderColor: colors.border, transform: [{ translateY: drag }] }]}>
        {/* The drag zone sits above the scrolling table, so pulling it never fights the scroll. */}
        <View testID="portion-sheet-handle" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.handleZone} {...pan.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <PortionTable product={product} />
          <Button variant="secondary" onPress={onClose}>{ro.nav.close}</Button>
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  // No text selection: on the web a mouse drag would select the table text instead of moving the sheet.
  sheet: { width: '100%', maxWidth: 480, maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, userSelect: 'none', // no overflow:hidden: iOS would clip the shadow
    // With no dark backdrop, a top border and a soft shadow mark where the sheet starts.
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, ...softShadow },
  handleZone: { alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 14 },
  handle: { width: 44, height: 5, borderRadius: 3 },
  scroll: { flexGrow: 0 },
  content: { gap: 8, paddingHorizontal: 16, paddingBottom: 24 },
});
