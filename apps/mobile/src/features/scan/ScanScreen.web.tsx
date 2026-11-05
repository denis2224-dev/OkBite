import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import type { Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';
import { useWebLiveScan } from './useWebLiveScan';

export default function ScanScreenWeb() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup();
  const { status: liveStatus, videoRef, retry: retryLive } = useWebLiveScan((code) => {
    void onCameraCode(code);
  });
  const working = state.status === 'working';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>{ro.scan.title}</Text>
      {liveStatus === 'starting' || liveStatus === 'live' ? (
        <View style={styles.preview}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {liveStatus === 'live' ? <Text style={styles.frameHint}>{ro.scan.frameHint}</Text> : <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.heroText} />}
        </View>
      ) : (
        <StatusPanel
          message={liveStatus === 'unsupported' ? ro.scan.webManualOnly : ro.scan.deniedText}
          actions={[
            ...(liveStatus === 'unavailable' ? [{ label: ro.errors.retry, onPress: retryLive }] : []),
            { label: ro.capture.title, onPress: () => router.push('/capture') },
          ]}
        />
      )}
      {working ? <View style={styles.status}><ActivityIndicator /><Text style={styles.working}>{ro.capture.working}</Text></View> : null}
      {state.status === 'error' || state.status === 'offline' ? (
        <StatusPanel
          title={state.status === 'offline' ? ro.offline.title : undefined}
          message={state.status === 'offline' ? ro.offline.subtitle : errorMessage(state.code)}
          actions={[
            { label: state.status === 'offline' ? ro.offline.retry : ro.errors.retry, onPress: () => { void retry(); } },
            { label: ro.nav.close, onPress: dismiss },
          ]}
        />
      ) : null}
      <ManualCode onSubmit={(code) => { void onManualCode(code); }} disabled={working} />
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { padding: 16, gap: 16 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  preview: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.hero, justifyContent: 'center' },
  frameHint: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: colors.hero, color: colors.heroText, textAlign: 'center' },
  working: { color: colors.ink },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
