import { useMemo, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { light as colors, fonts } from '../../theme/tokens';
import { ACTION_WIDTH, useSwipeReveal } from './useSwipeReveal';

// The red card starts this far inside the row's right end, so the two read as one shape.
const OVERLAP = 24;

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

  return <View style={styles.frame}>
    <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: x }] }}>
      {children}
      {/* The red card overlaps the row's right end and slides in with it: one shape, the row extended. */}
      {revealed && <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
        onPress={() => { settle(false); onDelete(); }} style={styles.action}>
        <Text style={styles.actionText}>{text}</Text>
      </Pressable>}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  // Clips what sticks out to the right while the row is closed; the row and the red card keep their own rounded corners.
  frame: { overflow: 'hidden', ...(Platform.OS === 'web' ? { touchAction: 'pan-y' as never } : {}) },
  action: { position: 'absolute', top: 0, bottom: 0, left: '100%', marginLeft: -OVERLAP, width: ACTION_WIDTH + OVERLAP, paddingLeft: OVERLAP, minHeight: 44, zIndex: 1, borderRadius: 20, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 15 },
});
