import { useMemo, type PropsWithChildren } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { shouldGoBack, swipeBackEnabled } from './swipeBack';

/** Back to wherever the user was just before (page or tab); nothing on the first screen. */
export function goBack(): void {
  if (router.canGoBack()) router.back();
}

/** The app's only back control: swipe right from the left edge on pages opened from somewhere (not on nav-bar pages).
 * The strip is thin so sideways scrolling inside pages keeps working; the screen-reader escape gesture also goes back. */
export function EdgeSwipeBack({ children }: PropsWithChildren) {
  const pan = useMemo(() => PanResponder.create({
    // Claim touches that start on the strip: on the web a mouse drag only reaches a responder that took the press.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    // Keep the gesture once taken: a scrolling page under the finger must not steal it halfway.
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderRelease: (_, g) => { if (shouldGoBack(g.dx, g.dy, g.vx)) goBack(); },
  }), []);
  const enabled = swipeBackEnabled(usePathname());
  return <View testID="edge-swipe-root" style={styles.root} onAccessibilityEscape={enabled ? goBack : undefined}>
    {children}
    {enabled && <View testID="edge-swipe" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.strip} {...pan.panHandlers} />}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 50 },
});
