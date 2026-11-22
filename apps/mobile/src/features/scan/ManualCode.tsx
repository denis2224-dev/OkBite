import React, { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode, codeValidationError } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, radii, spacing, type Palette } from '../../theme/tokens';
import { PrimaryButton, SecondaryButton } from '../../ui/PillButtons';

type Props = { open: boolean; onToggle: () => void; onSubmit: (code: string) => void; disabled?: boolean; trailing?: ReactNode };

/** One "Introdu codul" pill (with an optional control beside it); pressing it expands the code field in place. */
export function ManualCode({ open, onToggle, onSubmit, disabled, trailing }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [value, setValue] = useState('');
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
      <View style={styles.row}>
        <SecondaryButton label={ro.scan.manual} expanded={open} onPress={onToggle} style={styles.toggle} />
        {trailing}
      </View>
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
          style={styles.input}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={ro.scan.search} disabled={disabled} onPress={handleSubmit} />
      </> : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  box: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggle: { flex: 1 },
  error: { fontFamily: fonts.medium, color: colors.dangerText },
  input: { borderWidth: 1.5, borderColor: colors.checkboxBorder, backgroundColor: colors.surface, color: colors.ink, borderRadius: radii.pill, paddingHorizontal: 22, paddingVertical: 14, minHeight: 54, fontFamily: fonts.body, fontSize: 16, letterSpacing: 1 },
});
