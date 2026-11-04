import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { ro } from '../../copy/ro';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { ManualCode } from './ManualCode';
import { useScanLookup } from './useScanLookup';

const tapOnDetection = () => { void notificationAsync(NotificationFeedbackType.Success).catch(() => undefined); };

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  const [mountFailed, setMountFailed] = useState(false);
  const { state, onCameraCode, onManualCode, retry, dismiss } = useScanLookup(tapOnDetection);
  const working = state.status === 'working';

  let preview: React.ReactNode;
  if (!permission || permission.status === 'undetermined') {
    preview = <ActivityIndicator size="large" testID="permission-loading" />;
  } else if (!permission.granted) {
    preview = (
      <StatusPanel
        message={ro.scan.deniedText}
        actions={[{ label: ro.capture.openSettings, onPress: () => { void Linking.openSettings(); } }, { label: ro.capture.retry, onPress: () => { void requestPermission(); } }]}
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
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
          onBarcodeScanned={({ data }) => { void onCameraCode(data); }}
          onMountError={() => setMountFailed(true)}
        />
        <Text style={styles.frameHint}>{ro.scan.frameHint}</Text>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>{ro.scan.title}</Text>
      <View style={styles.preview}>{preview}</View>
      {working ? <View style={styles.status}><ActivityIndicator /><Text>{ro.capture.working}</Text></View> : null}
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

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  preview: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center' },
  frameHint: { position: 'absolute', bottom: 12, left: 12, right: 12, color: '#fff', textAlign: 'center' },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});

