import { useMemo, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../theme/useTheme';
import { swipeBackEnabled, usesCustomSwipe } from './swipeBack';
import { useSwipeBackDrag } from './useSwipeBackDrag';

/** Back to wherever the user was just before (page or tab); nothing on the first screen. */
export function goBack(): void {
  if (router.canGoBack()) router.back();
}

/** Swipe right from the left edge to go back, on every page except the nav-bar pages. On iPhone and Android the stack does it
 * natively, with the page following the finger. Here the same is drawn for the tab routes (Setări, Despre) and the web:
 * the page is dragged along with the finger, then slides off or springs back. The strip is thin so sideways scrolling inside
 * pages keeps working; the screen-reader escape gesture also goes back. */
export function EdgeSwipeBack({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { x, drag, release, cancel } = useSwipeBackDrag(width, goBack);
  const pan = useMemo(() => PanResponder.create({
    // Claim touches that start on the strip: on the web a mouse drag only reaches a responder that took the press.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    // Keep the gesture once taken: a scrolling page under the finger must not steal it halfway.
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderMove: (_, g) => drag(g.dx),
    onPanResponderRelease: (_, g) => release(g.dx, g.dy, g.vx),
    onPanResponderTerminate: cancel,
  }), [drag, release, cancel]);
  const enabled = swipeBackEnabled(pathname);
  const strip = usesCustomSwipe(pathname, Platform.OS);
  return <View testID="edge-swipe-root" style={[styles.root, { backgroundColor: colors.ground }]} onAccessibilityEscape={enabled ? goBack : undefined}>
    <Animated.View testID="edge-swipe-content" style={[styles.root, { backgroundColor: colors.ground, transform: [{ translateX: x }] }]}>{children}</Animated.View>
    {strip && <View testID="edge-swipe" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.strip} {...pan.panHandlers} />}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 50 },
});
