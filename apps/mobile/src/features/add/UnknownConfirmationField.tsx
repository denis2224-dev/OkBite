import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

export function UnknownConfirmationField({ label, value, onChange, disabled, multiline, numeric, invalid }: {
  label: string; value: string; onChange(value: string): void; disabled: boolean;
  multiline?: boolean; numeric?: boolean; invalid?: boolean;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const style = { minHeight: 44, padding: 12, borderRadius: 12, color: colors.ink,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: invalid ? colors.low : colors.border };
  return <View style={{ gap: 4 }}>
    <Text style={{ color: colors.muted, fontSize: 14 }}>{label}</Text>
    {editing ? <TextInput accessibilityLabel={label} value={text} editable={!disabled}
      multiline={multiline} keyboardType={numeric ? 'decimal-pad' : 'default'} autoFocus
      onChangeText={next => { setText(next); onChange(next); }} onBlur={() => { if (!invalid) setEditing(false); }}
      style={[style, { fontSize: 16 }]} />
      : <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
        accessibilityState={{ disabled }} accessibilityHint={ro.add.tapToEdit}
        onPress={() => { setText(value); setEditing(true); }} style={style}>
        <Text style={{ color: colors.ink, fontSize: 16 }}>{value || ro.result.undeclared}</Text>
      </Pressable>}
  </View>;
}
