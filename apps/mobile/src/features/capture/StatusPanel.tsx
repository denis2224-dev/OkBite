import React from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { fonts } from '../../theme/tokens';

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
}: {
  title?: string;
  message: string;
  actions: PanelAction[];
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLiveRegion="polite"
    >
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {title}
        </Text>
      ) : null}
      <Text style={[styles.message, { color: colors.ink }]}>{message}</Text>
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
  title: { fontSize: 18, lineHeight: 25, fontFamily: fonts.heading },
  message: { fontSize: 16, lineHeight: 23, fontFamily: fonts.body },
});

export type AnalysisFlowState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'pending' }
  | { status: 'offline'; afterPending?: boolean }
  | { status: 'error'; code?: string; afterPending?: boolean };

/** Overlay showing unconfirmed >55 s analysis status or recoverable error actions. */
export function AnalysisOverlay({
  state,
  canRetry,
  onRetry,
  gallery,
  onDismiss,
  overlayStyle,
  testIDPrefix,
}: {
  state: AnalysisFlowState;
  canRetry: boolean;
  onRetry: () => void;
  gallery: PanelAction;
  onDismiss: () => void;
  overlayStyle: StyleProp<ViewStyle>;
  testIDPrefix: string;
}) {
  if (state.status === 'pending') {
    return (
      <ScrollView
        testID={`${testIDPrefix}-pending-analysis`}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[overlayStyle, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <StatusPanel title={ro.pwa.analysis.title} message={ro.pwa.analysis.unknown} actions={[]} />
      </ScrollView>
    );
  }
  if (state.status !== 'error' && state.status !== 'offline') return null;
  const offline = state.status === 'offline';
  const base = offline ? ro.offline.subtitle : errorMessage(state.code);
  return (
    <ScrollView
      testID={`${testIDPrefix}-error-recovery`}
      style={StyleSheet.absoluteFill}
      contentContainerStyle={[overlayStyle, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusPanel
        title={offline ? ro.offline.title : undefined}
        message={state.afterPending ? `${base}\n\n${ro.pwa.analysis.retry}` : base}
        actions={[
          ...(canRetry ? [{ label: offline ? ro.offline.retry : ro.errors.retry, onPress: onRetry }] : []),
          gallery,
          { label: ro.nav.close, onPress: onDismiss },
        ]}
      />
    </ScrollView>
  );
}
