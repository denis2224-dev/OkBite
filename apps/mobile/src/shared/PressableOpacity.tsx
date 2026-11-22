import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function PressableOpacity({ style, onFocus, onBlur, onHoverIn, onHoverOut, android_ripple: _ripple, ...props }: PressableProps) {
 const { colors } = useTheme();
 const [focused, setFocused] = useState(false);
 return <Pressable {...props} android_ripple={undefined}
  onFocus={event => {
   const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
   setFocused(target.matches?.(':focus-visible') ?? false);
   onFocus?.(event);
  }}
  onHoverIn={onHoverIn}
  onHoverOut={onHoverOut}
  onPressIn={event => {
   const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
   setFocused(target.matches?.(':focus-visible') ?? false); props.onPressIn?.(event);
  }}
  onBlur={event => { setFocused(false); onBlur?.(event); }}
  style={state => [{ minHeight: 44 }, typeof style === 'function' ? style(state) : style,
   focused ? { outlineWidth: 3, outlineColor: colors.focus, outlineOffset: 2, outlineStyle: 'solid' } : { outlineWidth: 0 }]} />;
}
