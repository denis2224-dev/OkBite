import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';

/** One breath takes this long each way: slow enough to feel calm, not like a flash. */
export const BREATH_MS = 1200;
/** The loaded list fades in over this long. */
export const FADE_IN_MS = 450;

/** Three soft placeholder cards that slowly breathe while the best products load. */
export function LoadingRows() {
  const { colors } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: BREATH_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: BREATH_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] });
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading} style={styles.list}>
    {[0, 1, 2].map(row => <Animated.View key={row} testID="loading-row" style={[styles.placeholder, { backgroundColor: colors.soft, opacity }]} />)}
  </View>;
}
/** Fades its content in when it first appears, instead of popping in. */
export function FadeIn({ children }: PropsWithChildren) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const fade = Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [opacity]);
  return <Animated.View testID="fade-in" style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  placeholder: { minHeight: 88, borderRadius: 22 },
});
