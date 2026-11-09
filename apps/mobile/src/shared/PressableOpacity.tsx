import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
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
  style={state => [{ minHeight: 44 }, typeof style === 'function' ? style(state) : style,
   !props.disabled && (state.pressed ? { opacity: 0.6 } : hovered ? { opacity: 0.9 } : undefined),
   focused ? { outlineWidth: 3, outlineColor: colors.focus, outlineOffset: 2, outlineStyle: 'solid' } : { outlineWidth: 0 }]} />;
}
