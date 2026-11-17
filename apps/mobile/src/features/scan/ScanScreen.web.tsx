import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { Body, Button, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { depth } from '../../theme/depth';
import { radii, type Palette } from '../../theme/tokens';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { CameraBlocked } from './CameraBlocked';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';
import { useWebLiveScan } from './useWebLiveScan';
import { ScanReticle } from './ScanReticle';
import { ResultSheet } from '../product/ResultSheet';
import { cameraMessage } from '../capture/cameraSupport.web';
import type { ScanScreenProps } from './ScanScreen';

const iosPattern = /iPhone|iPad|iPod/;
/** Browser-specific steps to re-allow the camera, shown once a retry has failed. */
function deniedHelp(): string {
  const nav = typeof navigator === 'undefined' ? undefined : navigator as Partial<Navigator>;
  const ua = nav?.userAgent ?? '', platform = nav?.platform ?? '';
  if (iosPattern.test(platform) || iosPattern.test(ua) || (platform === 'MacIntel' && (nav?.maxTouchPoints ?? 0) > 1)) return ro.pwa.camera.iosDenied;
  return /Android/i.test(ua) ? ro.pwa.camera.androidDenied : ro.pwa.camera.browserDenied;
}

/** The browser has no torch control here, so `torch` is ignored. */
export default function ScanScreenWeb({ embedded = false }: ScanScreenProps = {}) {
  const focused = useIsFocused();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup();
  const { status: liveStatus, videoRef, retry: retryLive } = useWebLiveScan((code) => {
    void onCameraCode(code);
  });
  const [retried, setRetried] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const working = state.status === 'working';
  const denied = liveStatus === 'denied';
  const cameraOn = liveStatus === 'starting' || liveStatus === 'live';
  const frame = [styles.frame, embedded ? styles.embeddedPreview : styles.preview];
  // A blocked camera keeps the minimum size but grows with its text (200% font); no fixed size, since the web keeps one an `undefined` override tries to clear.
  const sized = [...frame, embedded ? styles.embeddedSize : styles.previewSize];

  const body = (
    <>
      {focused && state.status !== 'found' ? (
        <View testID="scan-preview" style={cameraOn ? sized : [...frame, styles.blockedWell]}>
          {cameraOn ? <>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {liveStatus === 'live' ? <ScanReticle /> : <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.cameraInk} />}
          </> : <CameraBlocked
            title={denied && retried ? ro.scan.deniedText : undefined}
            message={liveStatus === 'unsupported' ? ro.scan.webManualOnly : !denied ? cameraMessage(liveStatus) : retried ? deniedHelp() : ro.scan.deniedText}
            actions={['unavailable', 'denied', 'busy'].includes(liveStatus) ? [{ label: ro.errors.retry, onPress: () => { setRetried(true); retryLive(); } }] : []}
          />}
        </View>
      ) : null}
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
      <ManualCode open={manualOpen} onToggle={() => setManualOpen(open => !open)} onDark={embedded}
        onSubmit={(code) => { void onManualCode(code); }} disabled={working} />
      {state.status === 'found' && <ResultSheet product={state.product} score={state.score} onClose={dismiss} />}
    </>
  );
  if (embedded) return <View style={styles.embedded}>{body}</View>;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Heading style={styles.title}>{ro.scan.title}</Heading>
      {body}
      <Button variant="secondary" onPress={() => router.push('/capture')}>{ro.scan.photoLabel}</Button>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, lineHeight: 29 },
  // The scanner sits in an inset well: black while the camera runs, ivory when it is blocked.
  frame: { width: '100%', borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center', ...depth.well },
  blockedWell: { backgroundColor: colors.surface },
  // Portrait preview: tall enough to aim at a shelf, capped so manual entry stays reachable.
  preview: { minHeight: 280 },
  previewSize: { aspectRatio: 3 / 4, maxHeight: 440 },
  embedded: { gap: 16, paddingHorizontal: 16 },
  embeddedPreview: { minHeight: 240 },
  embeddedSize: { aspectRatio: 1.15, maxHeight: 340 },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
