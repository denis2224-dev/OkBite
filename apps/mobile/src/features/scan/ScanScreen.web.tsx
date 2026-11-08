import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';
import { useWebLiveScan } from './useWebLiveScan';

export default function ScanScreenWeb() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup();
  const { status: liveStatus, videoRef, retry: retryLive } = useWebLiveScan((code) => {
    void onCameraCode(code);
  });
  const working = state.status === 'working';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Heading style={styles.title}>{ro.scan.title}</Heading>
      {liveStatus === 'starting' || liveStatus === 'live' ? (
        <View style={styles.preview}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {liveStatus === 'live' ? <Text style={styles.frameHint}>{ro.scan.frameHint}</Text> : <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.cameraInk} />}
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
      {working ? <View style={styles.status}><ActivityIndicator /><Body>{ro.capture.working}</Body></View> : null}
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

const createStyles = (colors: Palette) => StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, fontWeight: '700' },
  preview: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  frameHint: { position: 'absolute', bottom: 12, left: 12, right: 12, color: colors.cameraInk, textAlign: 'center' },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
