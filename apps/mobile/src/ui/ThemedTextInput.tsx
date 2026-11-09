import { forwardRef, useState, type ComponentRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

/** Shared control boundary, disabled surface and keyboard focus across forms. */
export const ThemedTextInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(function ThemedTextInput(
  { style, onFocus, onBlur, editable, ...props }, ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return <TextInput ref={ref} placeholderTextColor={colors.muted} selectionColor={colors.primary}
    {...props} editable={editable}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[{ borderColor: colors.controlBorder, backgroundColor: colors.surface, color: colors.ink }, style,
      editable === false && { backgroundColor: colors.disabledBg, color: colors.disabledText },
      { outlineWidth: focused ? 3 : 0, outlineStyle: 'solid', outlineColor: colors.focus, outlineOffset: 2 }]} />;
});
