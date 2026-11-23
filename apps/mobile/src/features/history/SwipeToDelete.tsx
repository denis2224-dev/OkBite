import { useMemo, type PropsWithChildren } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { light as colors, fonts } from '../../theme/tokens';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
import { HomeIcon } from '../../shared/HomeChrome';
import { Body, Button, Card } from '../../ui';
import { ACTION_WIDTH, useSwipeReveal } from './useSwipeReveal';

type Props = PropsWithChildren<{
  /** Accessible name of the red button (it says which product is deleted). */
  label: string;
  /** The word on the red button and on the confirm button. */
  text: string;
  /** The question asked before anything is deleted. */
  question: string;
  cancelText: string;
  /** True while the "are you sure?" dialog is up. The parent owns it, so a screen reader can open it too. */
  asking: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
  disabled?: boolean;
}>;

/** Swipe a row from right to left: one swipe shows a red "Șterge" card, a second swipe covers the whole row. Either way it asks before deleting. */
export function SwipeToDelete({ label, text, question, cancelText, asking, onAsk, onCancel, onDelete, disabled = false, children }: Props) {
  const { reveal, revealed, width, setWidth, close, claims, drag, release, cancel } = useSwipeReveal(disabled, onAsk);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => claims(g.dx, g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => drag(g.dx),
    onPanResponderRelease: (_, g) => release(g.dx, g.vx),
    onPanResponderTerminate: cancel,
  }), [claims, drag, release, cancel]);
  // Pinned to the right and at least one button wide, so the icon and word stay centred in the red as it grows.
  const full = Math.max(width, ACTION_WIDTH + 1);
  const content = reveal.interpolate({ inputRange: [0, ACTION_WIDTH, full], outputRange: [ACTION_WIDTH, ACTION_WIDTH, full], extrapolate: 'clamp' });
  const stop = () => { onCancel(); close(); };

  return <View testID="swipe-frame" {...responder.panHandlers} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.frame}>
    {children}
    {revealed && <Animated.View testID="swipe-delete-card" style={[styles.reveal, { width: reveal }]}>
      <Animated.View style={[styles.content, { width: content }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onAsk} style={styles.action}>
          <HomeIcon name="trash" size={20} color={colors.onPrimary} />
          <Text style={styles.actionText}>{text}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>}
    <Modal visible={asking} transparent animationType="none" onRequestClose={stop}>
      <ScreenSafeArea edges={['top', 'bottom', 'left', 'right']} style={styles.scrim}>
        <View style={styles.dialog}>
          <Card accessibilityLabel={question} accessibilityViewIsModal>
            <Body>{question}</Body>
            <Button variant="secondary" onPress={stop}>{cancelText}</Button>
            <Button onPress={() => { close(); onDelete(); }}>{text}</Button>
          </Card>
        </View>
      </ScreenSafeArea>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  frame: { position: 'relative', ...(Platform.OS === 'web' ? { touchAction: 'pan-y' as never } : {}) },
  // Grows from the right end of the row, same height and same corners, so it reads as the row itself turning red.
  reveal: { position: 'absolute', top: 0, bottom: 0, right: 0, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.destructive },
  content: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  action: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 15 },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center' },
  dialog: { padding: 16, width: '100%', maxWidth: 430, alignSelf: 'center' },
});
