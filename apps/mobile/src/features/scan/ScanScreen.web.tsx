import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';
import { useWebLiveScan } from './useWebLiveScan';
import { ScanReticle } from './ScanReticle';
import { cameraMessage } from '../capture/cameraSupport.web';
import type { ScanScreenProps } from './ScanScreen';

/** The browser has no torch control here, so `torch` is ignored. */
export default function ScanScreenWeb({ embedded = false, manual = false }: ScanScreenProps = {}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup();
  const { status: liveStatus, videoRef, retry: retryLive } = useWebLiveScan((code) => {
    void onCameraCode(code);
  });
  const working = state.status === 'working';
  const cameraOn = liveStatus === 'starting' || liveStatus === 'live';
  const showManual = !embedded || manual || !cameraOn;

  const body = (
    <>
      {cameraOn ? (
        <View testID="scan-preview" style={embedded ? styles.embeddedPreview : styles.preview}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {liveStatus === 'live' ? <ScanReticle /> : <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.cameraInk} />}
        </View>
      ) : (
        <StatusPanel
          message={liveStatus === 'unsupported' ? ro.scan.webManualOnly : cameraMessage(liveStatus)}
          actions={[
            ...(['unavailable', 'denied', 'busy'].includes(liveStatus) ? [{ label: ro.errors.retry, onPress: retryLive }] : []),
            { label: ro.capture.title, onPress: () => router.push('/capture') },
          ]}
        />
      )}
      {working ? <View style={styles.status}><ActivityIndicator /><Body style={embedded ? { color: colors.cameraInk } : undefined}>{ro.capture.working}</Body></View> : null}
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
      {showManual ? <ManualCode onSubmit={(code) => { void onManualCode(code); }} disabled={working} autoFocus={embedded && manual} /> : null}
    </>
  );
  if (embedded) return <View style={styles.embedded}>{body}</View>;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Heading style={styles.title}>{ro.scan.title}</Heading>
      {body}
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, lineHeight: 29 },
  // Portrait preview: tall enough to aim at a shelf, capped so manual entry stays reachable.
  preview: { width: '100%', aspectRatio: 3 / 4, minHeight: 280, maxHeight: 440, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  embedded: { gap: 16, paddingHorizontal: 16 },
  embeddedPreview: { width: '100%', aspectRatio: 1.15, minHeight: 240, maxHeight: 340, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
