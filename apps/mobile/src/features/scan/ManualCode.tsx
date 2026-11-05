import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode } from '@okbite/shared';
import { ro } from '../../copy/ro';
import type { Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';

export function ManualCode({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: Palette) => StyleSheet.create({
  box: { gap: 8, padding: 16 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.muted },
  error: { color: colors.low },
  input: { color: colors.ink, backgroundColor: colors.surface, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
});
