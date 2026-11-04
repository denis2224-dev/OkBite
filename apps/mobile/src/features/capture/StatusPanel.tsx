import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';

export const errorMessage = (code?: string): string => {
  switch (code) {
    case 'rate_limited': return ro.errors.rateLimited;
    case 'upstream_failed': return ro.errors.upstreamFailed;
    case 'invalid_response': return ro.errors.invalidResponse;
    case 'duplicate': return ro.errors.duplicate;
    case 'not_found': return ro.errors.notFound;
    default: return ro.errors.generic;
  }
};

export type PanelAction = { label: string; onPress: () => void };

// shortcut: plain buttons until R4's B1 UI kit (Button) is merged; swap ActionButton for it then.
export function ActionButton({ label, onPress, disabled }: PanelAction & { disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

/** A message with the actions that get the user out of it. */
export function StatusPanel({ title, message, actions }: { title?: string; message: string; actions: PanelAction[] }) {
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
      {actions.map((a) => <ActionButton key={a.label} {...a} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, padding: 20, alignItems: 'stretch', backgroundColor: '#fff', borderRadius: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 16 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#e8e8e8' },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
