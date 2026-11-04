import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCode } from '@okbite/shared';
import { ro } from '../../copy/ro';

export function ManualCode({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
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
      <Text>{ro.scan.manualHint}</Text>
      <TextInput
        accessibilityLabel={ro.scan.manualTitle}
        keyboardType="number-pad"
        value={value}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ro.scan.search}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={handleSubmit}
        style={[styles.button, disabled && styles.disabled]}
      >
        <Text style={styles.buttonText}>{ro.scan.search}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#999', borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#e8e8e8' },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
