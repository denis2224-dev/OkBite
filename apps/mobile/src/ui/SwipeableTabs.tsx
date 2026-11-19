import { useEffect, useState, type ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export type SwipeTab = { key: string; label: string; render: () => ReactNode };
type Box = { x: number; width: number };

// Snappy, no overshoot.
const SPRING = { damping: 26, stiffness: 260, mass: 1, overshootClamping: true };
const THRESHOLD = 0.35;
const FLICK = 800;
const RUBBER = 0.25;
// A mouse drag on web would select text instead of moving the pages.
const noSelect = { userSelect: 'none' } as unknown as ViewStyle;

/** Tabs you can tap or swipe. Pages follow the finger 1:1 and the area takes the selected page's height; the selected pill slides and resizes with the drag.
 * Past 35% of the width or a quick flick it snaps to the neighbour, else back. The first and last tab resist. */
export function SwipeableTabs({ tabs, index, onIndexChange }: { tabs: SwipeTab[]; index: number; onIndexChange: (index: number) => void }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [boxes, setBoxes] = useState<(Box | undefined)[]>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const position = useSharedValue(index);
  const last = tabs.length - 1;
  useEffect(() => { position.set(withSpring(index, SPRING)); }, [index, position]);

  const pan = Gesture.Pan().withTestId('swipeable-pan').activeOffsetX([-12, 12]).failOffsetY([-10, 10])
    .onUpdate(event => {
      if (!width) return;
      const raw = index - event.translationX / width;
      position.set(raw < 0 ? raw * RUBBER : raw > last ? last + (raw - last) * RUBBER : raw);
    })
    .onEnd(event => {
      let target = index;
      if (width && (event.translationX < -THRESHOLD * width || event.velocityX < -FLICK)) target = Math.min(last, index + 1);
      else if (width && (event.translationX > THRESHOLD * width || event.velocityX > FLICK)) target = Math.max(0, index - 1);
      position.set(withSpring(target, SPRING));
      if (target !== index) scheduleOnRN(onIndexChange, target);
    });

  const measured = boxes.length === tabs.length && boxes.every(Boolean) ? boxes as Box[] : null;
  const steps = tabs.map((_, i) => i);
  const indicator = useAnimatedStyle(() => measured
    ? { left: interpolate(position.get(), steps, measured.map(box => box.x), 'clamp'), width: interpolate(position.get(), steps, measured.map(box => box.width), 'clamp') }
    : { left: 0, width: 0 });
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: -position.get() * width }] }));

  return <View style={{ gap: 16 }}>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 5, gap: 4, borderRadius: radii.segment, backgroundColor: colors.surface, boxShadow: shadows.raisedSm }}>
      <Animated.View testID="swipeable-indicator" pointerEvents="none" style={[{ position: 'absolute', top: 5, bottom: 5, borderRadius: radii.segmentTab, backgroundColor: colors.primary }, indicator]} />
      {tabs.map((tab, i) => {
        const selected = i === index;
        return <PressableOpacity key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={() => onIndexChange(i)}
          onLayout={event => { const { x, width: w } = event.nativeEvent.layout; setBoxes(current => { const next = [...current]; next[i] = { x, width: w }; return next; }); }}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 10, borderRadius: radii.segmentTab, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparent }}>
          <Text allowFontScaling numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: selected ? colors.onPrimary : colors.textSecondary }}>{tab.label}</Text>
        </PressableOpacity>;
      })}
    </View>
    <GestureDetector gesture={pan}>
      <View testID="swipeable-pages" style={[{ overflow: 'hidden', height: heights[index] || undefined }, noSelect]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View style={[{ flexDirection: 'row', width: width * tabs.length || undefined, alignItems: 'flex-start' }, row]}>
          {tabs.map((tab, i) => <View key={tab.key} style={{ width: width || undefined, flex: width ? undefined : 1 }}
            onLayout={event => { const h = event.nativeEvent.layout.height; setHeights(current => current[i] === h ? current : Object.assign([...current], { [i]: h })); }}
            accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}>{tab.render()}</View>)}
        </Animated.View>
      </View>
    </GestureDetector>
  </View>;
}
