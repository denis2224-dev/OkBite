import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { normalizeCode } from '@okbite/shared';
import { ro } from '../../copy/ro';

export function ManualCode({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = () => {
    const normalized = normalizeCode(value);
    if (!normalized) return setError(ro.scan.manualInvalid);
    setError(null);
    onSubmit(normalized);
  };
  const handleChange = (text: string) => { setValue(text); setError(null); };
  const errorNode = error ? <Text accessibilityRole="alert">{error}</Text> : null;
  return (
    <View>
      <Text>{ro.scan.manualTitle}</Text>
      <Text>{ro.scan.manualHint}</Text>
      <TextInput accessibilityLabel={ro.scan.manualTitle} keyboardType="number-pad" value={value} onChangeText={handleChange} />
      <Pressable accessibilityRole="button" accessibilityLabel={ro.scan.search} onPress={handleSubmit}><Text>{ro.scan.search}</Text></Pressable>
      {errorNode}
    </View>
  );
}
