import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Body } from './Typography';

/** Label left, 64×38 switch right. The row never moves or resizes; the thumb slides in 200 ms (instant with reduced motion). */
export function ToggleRow({ label, on, onToggle, disabled, first = false }: { label: string; on: boolean; onToggle: () => unknown; disabled?: boolean; first?: boolean }) {
  const { colors } = useTheme();
  const [x] = useState(() => new Animated.Value(on ? 26 : 0));
  const mounted = useRef(false);
  useEffect(() => {
    const target = on ? 26 : 0;
    if (!mounted.current) { mounted.current = true; return; }
    let live = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(reduced => {
      if (!live) return;
      if (reduced !== false) x.setValue(target);
      else Animated.timing(x, { toValue: target, duration: 200, useNativeDriver: true }).start();
    }).catch(() => x.setValue(target));
    return () => { live = false; };
  }, [on, x]);
  return <PressableOpacity accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on, disabled: !!disabled }} disabled={disabled} onPress={onToggle}
    style={{ minHeight: 60, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
    <Body style={{ flex: 1 }}>{label}</Body>
    <View testID="switch-track" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 64, height: 38, borderRadius: 19, padding: 4, justifyContent: 'center', backgroundColor: on ? colors.primary : colors.switchOff, boxShadow: shadows.inset }}>
      <Animated.View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.onPrimary, boxShadow: '0px 2px 4px rgba(43,43,40,0.18)', transform: [{ translateX: x }] }} />
    </View>
  </PressableOpacity>;
}
