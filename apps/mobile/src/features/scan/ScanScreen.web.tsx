import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { Body, Button, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
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

/** The browser has no torch or zoom control here, so `torch` and `zoom` are ignored. */
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
  const frame = embedded ? styles.embeddedPreview : styles.preview;

  const body = (
    <>
      {focused && state.status !== 'found' ? (
        <View testID="scan-preview" style={cameraOn ? frame : [frame, styles.blocked]}>
          {cameraOn ? <>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {liveStatus === 'live' ? <ScanReticle hintBottom={embedded ? 128 : undefined} /> : <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.cameraInk} />}
          </> : <CameraBlocked
            title={denied && retried ? ro.scan.deniedText : undefined}
            message={liveStatus === 'unsupported' ? ro.scan.webManualOnly : !denied ? cameraMessage(liveStatus) : retried ? deniedHelp() : ro.scan.deniedText}
            actions={['unavailable', 'denied', 'busy'].includes(liveStatus) ? [{ label: ro.errors.retry, onPress: () => { setRetried(true); retryLive(); } }] : []}
          />}
        </View>
      ) : null}
      {working ? <View style={[styles.status, embedded && styles.overlay]}><ActivityIndicator /><Body style={embedded ? { color: colors.cameraInk } : undefined}>{ro.capture.working}</Body></View> : null}
      {state.status === 'error' || state.status === 'offline' ? (
        <View style={embedded ? styles.overlay : undefined}><StatusPanel
          title={state.status === 'offline' ? ro.offline.title : undefined}
          message={state.status === 'offline' ? ro.offline.subtitle : errorMessage(state.code)}
          actions={[
            { label: state.status === 'offline' ? ro.offline.retry : ro.errors.retry, onPress: () => { void retry(); } },
            { label: ro.nav.close, onPress: dismiss },
          ]}
        /></View>
      ) : null}
      {embedded ? null : <ManualCode open={manualOpen} onToggle={() => setManualOpen(open => !open)}
        onSubmit={(code) => { void onManualCode(code); }} disabled={working} />}
      {state.status === 'found' && <ResultSheet product={state.product} score={state.score} onClose={dismiss} storageError={state.storageError} />}
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
  // Portrait preview: tall enough to aim at a shelf, capped so manual entry stays reachable.
  preview: { width: '100%', aspectRatio: 3 / 4, minHeight: 280, maxHeight: 440, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  embedded: { flex: 1 },
  embeddedPreview: { flex: 1, minHeight: 240, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  // A blocked camera keeps the frame's minimum size but grows with its text (200% font) instead of clipping it.
  blocked: { maxHeight: undefined, aspectRatio: undefined },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 16, right: 16, top: '40%' },
});
