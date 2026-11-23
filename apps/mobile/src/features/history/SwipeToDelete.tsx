import { useMemo, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { light as colors, fonts } from '../../theme/tokens';
import { ACTION_WIDTH, useSwipeReveal } from './useSwipeReveal';

type Props = PropsWithChildren<{
  /** Accessible name of the red button (it says which product is deleted). */
  label: string;
  /** The word on the red button. */
  text: string;
  onDelete: () => void;
  disabled?: boolean;
}>;

/** Swipe a row from right to left to reveal one medium red delete button; swipe back (or tap the row) to hide it. */
export function SwipeToDelete({ label, text, onDelete, disabled = false, children }: Props) {
  const { x, revealed, settle, claims, drag, release, cancel } = useSwipeReveal(disabled);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => claims(g.dx, g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => drag(g.dx),
    onPanResponderRelease: (_, g) => release(g.dx, g.vx),
    onPanResponderTerminate: cancel,
  }), [claims, drag, release, cancel]);

  // The row stays where it is. The red card grows out of its right end as the finger moves left.
  const width = x.interpolate({ inputRange: [-ACTION_WIDTH, 0], outputRange: [ACTION_WIDTH, 0], extrapolate: 'clamp' });
  return <View {...responder.panHandlers} style={styles.frame}>
    {children}
    {revealed && <Animated.View testID="swipe-delete-card" style={[styles.reveal, { width }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
        onPress={() => { settle(false); onDelete(); }} style={styles.action}>
        <Text style={styles.actionText}>{text}</Text>
      </Pressable>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { position: 'relative', ...(Platform.OS === 'web' ? { touchAction: 'pan-y' as never } : {}) },
  // Grows from the right end of the row; its rounded corners overlap the row so the two read as one shape.
  reveal: { position: 'absolute', top: 0, bottom: 0, right: 0, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.destructive },
  // Fixed width, pinned right: the word stays centred in the card once it is fully out and is not squeezed on the way.
  action: { position: 'absolute', top: 0, bottom: 0, right: 0, width: ACTION_WIDTH, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 15 },
});
