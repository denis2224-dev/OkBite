import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { useCameraAccess } from '../capture/useCameraAccess';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { ro } from '../../copy/ro';
import { Button } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { fonts, type Palette } from '../../theme/tokens';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { CameraBlocked } from './CameraBlocked';
import { ScanReticle } from './ScanReticle';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';
import { ResultSheet } from '../product/ResultSheet';

const tapOnDetection = () => { void notificationAsync(NotificationFeedbackType.Success).catch(() => undefined); };

/** `embedded`: inside Scan home, which draws its own header. */
/** `trailing`: a control drawn beside the manual-entry pill (Scan home puts the flash there). */
export type ScanScreenProps = { embedded?: boolean; torch?: boolean; trailing?: React.ReactNode };

export default function ScanScreen({ embedded = false, torch = false, trailing }: ScanScreenProps = {}) {
  const focused = useIsFocused();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { permission, requestPermission, settingsAction, message } = useCameraAccess();
  const [mountFailed, setMountFailed] = useState(false);
  const [retried, setRetried] = useState(false); // Settings are offered only once a retry has failed.
  const [manualOpen, setManualOpen] = useState(false);
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup(tapOnDetection);
  const working = state.status === 'working';

  let preview: React.ReactNode;
  const blocked = !!permission && permission.status !== 'undetermined' && (!permission.granted || mountFailed);
  if (!permission || permission.status === 'undetermined') {
    preview = <ActivityIndicator size="large" testID="permission-loading" />;
  } else if (!permission.granted) {
    preview = (
      <CameraBlocked
        message={message ?? ro.scan.deniedText}
        actions={[{ label: ro.errors.retry, onPress: () => { void requestPermission().then(() => setRetried(true)); } },
          ...(retried && settingsAction ? [settingsAction] : [])]}
      />
    );
  } else if (mountFailed) {
    preview = <CameraBlocked message={ro.errors.generic} actions={[{ label: ro.errors.retry, onPress: () => setMountFailed(false) }]} />;
  } else {
    preview = (
      <>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
          onBarcodeScanned={({ data }) => { void onCameraCode(data); }}
          onMountError={() => setMountFailed(true)}
        />
        <ScanReticle />
      </>
    );
  }

  const body = (
    <>
      {focused && state.status !== 'found' ? <View testID="scan-preview" style={[embedded ? styles.embeddedPreview : styles.preview, blocked && styles.blocked]}>{preview}</View> : null}
      {working ? <View style={styles.status}><ActivityIndicator color={colors.primary} /><Text style={styles.working}>{ro.capture.working}</Text></View> : null}
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
      <ManualCode open={manualOpen} onToggle={() => setManualOpen(open => !open)} trailing={trailing}
        onSubmit={(code) => { void onManualCode(code); }} disabled={working} />
      {state.status === 'found' && <ResultSheet product={state.product} score={state.score} onClose={dismiss} />}
    </>
  );
  if (embedded) return <View style={styles.embedded}>{body}</View>;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>{ro.scan.title}</Text>
      {body}
      <Button variant="secondary" onPress={() => router.push('/capture')}>{ro.scan.photoLabel}</Button>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, lineHeight: 29, fontFamily: fonts.heading, color: colors.ink },
  // Portrait preview: tall enough to aim at a shelf, capped so manual entry stays reachable.
  preview: { width: '100%', aspectRatio: 3 / 4, minHeight: 280, maxHeight: 440, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  embedded: { gap: 16 },
  // Inside Scan home the dark area frames the camera; keep the recent-scans sheet in view.
  embeddedPreview: { width: '100%', height: 330, minHeight: 330, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.cameraBg, justifyContent: 'center' },
  // A blocked camera keeps the frame's minimum size but grows with its text (200% font) instead of clipping it.
  blocked: { height: undefined, maxHeight: undefined, aspectRatio: undefined },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  working: { color: colors.ink, fontFamily: fonts.body },
});
