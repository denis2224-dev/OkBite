import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, type Palette } from '../../theme/tokens';
import { Button } from '../../ui/Button';

export function ManualCode({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
      <Text style={styles.title}>{ro.scan.manualTitle}</Text>
      <Text style={styles.hint}>{ro.scan.manualHint}</Text>
      <TextInput
        accessibilityLabel={ro.scan.manualTitle}
        accessibilityState={{ disabled: !!disabled }}
        editable={!disabled}
        keyboardType="number-pad"
        value={value}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button disabled={disabled} onPress={handleSubmit}>
        {ro.scan.search}
      </Button>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  box: { gap: 8, padding: 16, backgroundColor: colors.ground },
  title: { fontSize: 18, lineHeight: 25, fontFamily: fonts.heading, color: colors.ink },
  hint: { fontFamily: fonts.body, color: colors.muted },
  error: { fontFamily: fonts.medium, color: colors.low },
  input: { borderWidth: 1, borderColor: colors.muted, backgroundColor: colors.surface, color: colors.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontFamily: fonts.body, fontSize: 16, letterSpacing: 1 },
});
