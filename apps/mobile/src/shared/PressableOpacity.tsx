import { useState } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function PressableOpacity({ style, onFocus, onBlur, onHoverIn, onHoverOut, android_ripple: _ripple, ...props }: PressableProps) {
 const { colors } = useTheme();
 const [hovered, setHovered] = useState(false);
 const [focused, setFocused] = useState(false);
 return <Pressable {...props} android_ripple={undefined}
  onFocus={event => {
   const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
   setFocused(target.matches?.(':focus-visible') ?? false);
   onFocus?.(event);
  }}
  onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
  onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
  onPressIn={event => {
   const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
   setFocused(target.matches?.(':focus-visible') ?? false); props.onPressIn?.(event);
  }}
  onBlur={event => { setFocused(false); onBlur?.(event); }}
  style={state => {
   const base = typeof style === 'function' ? style(state) : style;
   const bg = StyleSheet.flatten(base)?.backgroundColor;
   const onFill = bg === colors.primary ? colors.onPrimary : bg === colors.accent ? colors.onAccent : undefined;
   const active = !props.disabled && (state.pressed || hovered);
   const neutral = !bg || bg === colors.transparent || [colors.ground, colors.surface, colors.soft].includes(String(bg));
   const backgroundColor = bg === colors.primary ? (state.pressed ? colors.primaryPressed : colors.primaryHover)
    : neutral ? (state.pressed ? colors.pressedSurface : colors.hoverSurface) : bg;
   return [{ minHeight: 44 }, base, active && { backgroundColor },
    { outlineWidth: focused ? 3 : active ? (state.pressed ? 2 : 1) : 0,
      outlineColor: onFill ?? (focused ? colors.focus : colors.controlBorder), outlineOffset: -3, outlineStyle: 'solid' }];
  }} />;
}
