import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, radii, spacing, type Palette } from '../../theme/tokens';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Button } from '../../ui/Button';
import { ScanIcon } from './ScanIcon';

type Props = { open: boolean; onToggle: () => void; onSubmit: (code: string) => void; disabled?: boolean; onDark?: boolean };

/** One quiet "Introdu codul" row; pressing it expands the code field in place. `onDark` adapts it to the camera panel. */
export function ManualCode({ open, onToggle, onSubmit, disabled, onDark }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const ink = onDark ? colors.cameraInk : colors.ink;
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (disabled) return;
    const code = normalizeCode(value);
    if (!code) return setError(value.trim() ? ro.scan.manualInvalid : ro.scan.manualEmpty);
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
        style={[styles.row, { borderColor: onDark ? colors.hero : colors.border }]}>
        <ScanIcon name="keyboard" size={20} color={ink} />
        <Text style={[styles.rowText, { color: ink }]}>{ro.scan.manual}</Text>
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
          style={styles.input}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.error, onDark && { color: colors.cameraInk }]}>{error}</Text> : null}
        <Button disabled={disabled} onPress={handleSubmit}>
          {ro.scan.search}
        </Button>
      </> : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  box: { gap: spacing.sm },
  row: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.small, borderWidth: 1 },
  rowText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
  error: { fontFamily: fonts.medium, color: colors.low },
  input: { borderWidth: 1, borderColor: colors.muted, backgroundColor: colors.surface, color: colors.ink, borderRadius: radii.small, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontFamily: fonts.body, fontSize: 16, letterSpacing: 1 },
});
