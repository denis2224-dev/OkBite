import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';

export const errorMessage = (code?: string): string => {
  switch (code) {
    case 'offline': return ro.errors.offline;
    case 'invalid_response': return ro.errors.invalid_response;
    case 'rate_limited': return ro.errors.rate_limited;
    case 'bad_request': return ro.errors.bad_request;
    case 'not_found': return ro.errors.not_found;
    case 'unauthorized': return ro.errors.unauthorized;
    case 'upstream_failed': return ro.errors.upstream_failed;
    case 'duplicate': return ro.errors.duplicate;
    case 'configuration': return ro.errors.configuration;
    default: return ro.errors.generic;
  }
};

export type PanelAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function ActionButton({
  label,
  onPress,
  disabled,
  variant = 'secondary',
}: PanelAction & { disabled?: boolean }) {
  return (
    <Button variant={variant} disabled={disabled} onPress={onPress}>
      {label}
    </Button>
  );
}

/** A message with the actions that get the user out of it. */
export function StatusPanel({
  title,
  message,
  actions,
  tone = 'neutral',
}: {
  tone?: 'neutral' | 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  actions: PanelAction[];
}) {
  const { colors } = useTheme();
  const foreground = tone === 'neutral' ? colors.ink : colors[tone];
  const background = tone === 'neutral' ? colors.surface : colors[`${tone}Bg`];
  return (
    <View
      style={[styles.panel, { backgroundColor: background, borderColor: colors.border }]}
      accessibilityLiveRegion="polite"
    >
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: foreground }]}>
          {title}
        </Text>
      ) : null}
      <Text accessibilityRole={tone === 'error' ? 'alert' : undefined}
        style={[styles.message, { color: foreground, backgroundColor: background }]}>{message}</Text>
      {actions.map((a, index) => (
        <ActionButton
          key={a.label}
          variant={a.variant ?? (index === 0 ? 'primary' : 'secondary')}
          {...a}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    padding: 20,
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 16 },
});
