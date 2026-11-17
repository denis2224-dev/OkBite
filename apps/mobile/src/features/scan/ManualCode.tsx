import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode, codeValidationError } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, radii, spacing, type Palette } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Button } from '../../ui/Button';
import { ScanIcon } from './ScanIcon';

type Props = { open: boolean; onToggle: () => void; onSubmit: (code: string) => void; disabled?: boolean; onDark?: boolean };

/** One raised "Introdu codul" pill; pressing it expands the code field in place. `onDark` keeps the error legible and uses the on-dark depth on the camera panel. */
export function ManualCode({ open, onToggle, onSubmit, disabled, onDark }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (disabled) return;
    const code = normalizeCode(value);
    if (!code) {
      if (!value.trim()) return setError(ro.scan.manualEmpty);
      return setError(codeValidationError(value) === 'checksum' ? ro.scan.manualChecksum : ro.scan.manualInvalid);
    }
    setError(null);
    onSubmit(code);
  };
  const handleChange = (text: string) => {
    setValue(text);
    setError(null);
  };

  return (
    <View style={styles.box}>
      <Pressable accessibilityRole="button" accessibilityLabel={ro.scan.manual} accessibilityState={{ expanded: open }} onPress={onToggle}
        style={[styles.row, onDark ? depth.raisedOnDark : depth.raisedSmall]}>
        <ScanIcon name="keyboard" size={20} color={colors.primary} />
        <Text style={styles.rowText}>{ro.scan.manual}</Text>
      </Pressable>
      {open ? <>
        <TextInput
          accessibilityLabel={ro.scan.manualTitle}
          accessibilityState={{ disabled: !!disabled }}
          editable={!disabled}
          autoFocus
          keyboardType="number-pad"
          placeholder={ro.scan.manualPlaceholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={handleChange}
          onSubmitEditing={handleSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused]}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.error, onDark && { color: colors.cameraInk }]}>{error}</Text> : null}
        {/* On the camera panel the raised forest drops its white lift, which would read as a halo; pressing keeps the shared pushed-in look. */}
        <Button disabled={disabled} onPress={handleSubmit} style={onDark ? ({ pressed }) => (pressed ? null : depth.forestOnDark) : undefined}>
          {ro.scan.search}
        </Button>
      </> : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  box: { gap: spacing.sm },
  row: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface },
  rowText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, textAlign: 'center', flexShrink: 1, color: colors.ink },
  error: { fontFamily: fonts.medium, color: colors.low },
  // An inset well; the 2 pt border is transparent until focus so the text never moves.
  input: { borderWidth: 2, borderColor: colors.transparent, ...depth.well, backgroundColor: colors.surface, color: colors.ink, borderRadius: radii.small, paddingHorizontal: 13, paddingVertical: 11, minHeight: 48, fontFamily: fonts.body, fontSize: 16, letterSpacing: 1 },
  // Forest focus ring; the browser's own outline is turned off so the web shows forest too.
  inputFocused: { borderColor: colors.focus, outlineStyle: 'solid', outlineWidth: 0 },
});
