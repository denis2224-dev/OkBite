import { useMemo, type PropsWithChildren } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useSheetDrag } from './useSheetDrag';

type Props = PropsWithChildren<{
  onClose: () => void;
  testID?: string;
  /** Accessible name of the sheet. */
  label?: string;
  /** Tapping the dimmed page closes the sheet. Off by default. */
  backdropCloses?: boolean;
  /** Gives the dimmed page a screen-reader name (a close button) when it closes the sheet. */
  backdropLabel?: string;
  /** Lifts the sheet above the keyboard (for sheets with a text field). */
  avoidKeyboard?: boolean;
  /** Return false to stop a swipe from closing (for example while something is being sent). */
  canClose?: () => boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/** The bottom sheet every "tab from below" uses. Swipe down from anywhere on it to close it (no handle bar; when its content scrolls, only while it is at the top).
 * It cannot be pulled up: the content does not bounce, so the page behind never shows under it. */
export function SwipeSheet({ onClose, testID = 'sheet', label, backdropCloses = false, backdropLabel, avoidKeyboard = false, canClose, contentStyle, children }: Props) {
  const { colors } = useTheme();
  const { y, claims, atTop, scrollTo, drag, release, cancel } = useSheetDrag(onClose, canClose);
  const pan = useMemo(() => PanResponder.create({
    // On the web a mouse drag only reaches a responder that took the press; buttons and links inside still win their own taps.
    // On a phone the panel takes only a downward pull, so scrolling and taps inside are left alone.
    onStartShouldSetPanResponder: () => Platform.OS === 'web',
    onMoveShouldSetPanResponder: (_, g) => claims(g.dx, g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => drag(atTop() ? g.dy : 0),
    onPanResponderRelease: (_, g) => release(atTop() ? g.dy : 0, g.vy),
    onPanResponderTerminate: cancel,
  }), [claims, atTop, drag, release, cancel]);
  const Frame = avoidKeyboard ? KeyboardAvoidingView : View;
  return <Modal accessibilityLabel={label} transparent animationType="none" onRequestClose={onClose}>
    <Frame {...(avoidKeyboard ? { behavior: 'padding' as const } : {})} style={[styles.overlay, { backgroundColor: colors.scrim }]}>
      {backdropCloses && <Pressable testID={`${testID}-backdrop`} accessible={!!backdropLabel} accessibilityRole={backdropLabel ? 'button' : undefined} accessibilityLabel={backdropLabel} onPress={onClose} style={StyleSheet.absoluteFill} />}
      <View testID={`${testID}-frame`} pointerEvents="box-none" style={styles.anchor}>
      <Animated.View testID={testID} accessibilityViewIsModal {...pan.panHandlers}
        style={[styles.panel, { backgroundColor: colors.ground, transform: [{ translateY: y }] }]}>
        <ScrollView testID={`${testID}-scroll`} bounces={false} overScrollMode="never" alwaysBounceVertical={false} keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16} onScroll={event => scrollTo(event.nativeEvent.contentOffset.y)}
          style={styles.scroll} contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
      </Animated.View>
      </View>
    </Frame>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  // The panel's own container: it keeps the dimmed page behind it a separate, tappable sibling.
  anchor: { width: '100%', maxHeight: '90%' },
  // No text selection on the web: a mouse drag would select text instead of moving the sheet.
  // The panel has no height cap of its own: a percentage of a content-sized parent would cut it short and leave a gap under it. The frame caps the height; the panel and its scroll area shrink to fit.
  panel: { width: '100%', maxWidth: 480, flexShrink: 1, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, ...(Platform.OS === 'web' ? { userSelect: 'none' as const } : {}) },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
});
