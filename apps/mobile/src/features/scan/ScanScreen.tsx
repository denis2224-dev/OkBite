import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useCameraAccess } from '../capture/useCameraAccess';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, type Palette } from '../../theme/tokens';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { ScanReticle } from './ScanReticle';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';

const tapOnDetection = () => { void notificationAsync(NotificationFeedbackType.Success).catch(() => undefined); };

/** `embedded`: inside Scan home, which draws its own header and opens manual entry from a keyboard button. */
export type ScanScreenProps = { embedded?: boolean; torch?: boolean; manual?: boolean };

export default function ScanScreen({ embedded = false, torch = false, manual = false }: ScanScreenProps = {}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { permission, requestPermission, settingsAction, message } = useCameraAccess();
  const [mountFailed, setMountFailed] = useState(false);
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup(tapOnDetection);
  const working = state.status === 'working';
  const cameraBlocked = !!permission && permission.status !== 'undetermined' && (!permission.granted || mountFailed);
  const showManual = !embedded || manual || cameraBlocked;

  let preview: React.ReactNode;
  if (!permission || permission.status === 'undetermined') {
    preview = <ActivityIndicator size="large" testID="permission-loading" />;
  } else if (!permission.granted) {
    preview = (
      <StatusPanel
        message={message ?? ro.scan.deniedText}
        actions={[...(settingsAction ? [settingsAction] : []), { label: ro.capture.retry, onPress: () => { void requestPermission(); } }]}
      />
    );
  } else if (mountFailed) {
    preview = <StatusPanel message={ro.errors.generic} actions={[{ label: ro.errors.retry, onPress: () => setMountFailed(false) }]} />;
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
      <View style={embedded ? styles.embeddedPreview : styles.preview}>{preview}</View>
      {working ? <View style={styles.status}><ActivityIndicator color={embedded ? colors.cameraInk : colors.primary} /><Text style={[styles.working, embedded && { color: colors.cameraInk }]}>{ro.capture.working}</Text></View> : null}
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
      <Text accessibilityRole="header" style={styles.title}>{ro.scan.title}</Text>
      {body}
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, lineHeight: 29, fontFamily: fonts.heading, color: colors.ink },
  // Portrait preview: tall enough to aim at a shelf, capped so manual entry stays reachable.
  preview: { width: '100%', aspectRatio: 3 / 4, minHeight: 280, maxHeight: 440, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  embedded: { gap: 16, paddingHorizontal: 16 },
  // Inside Scan home the dark area frames the camera; keep the recent-scans sheet in view.
  embeddedPreview: { width: '100%', aspectRatio: 1.15, minHeight: 240, maxHeight: 340, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cameraBackground, justifyContent: 'center' },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  working: { color: colors.ink, fontFamily: fonts.body },
});
