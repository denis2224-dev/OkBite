import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ro } from '../../copy/ro';
import { ActionButton, StatusPanel, errorMessage } from './StatusPanel';
import { useCaptureFlow } from './useCaptureFlow';

export default function CaptureScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [mountFailed, setMountFailed] = useState(false);
  const { state, takePhoto, pickFromGallery, retry, dismiss, canRetry } = useCaptureFlow();
  const working = state.status === 'working';

  // Permission unknown, or the system dialog is still open.
  if (!permission || permission.status === 'undetermined') {
    return <View style={styles.center}><ActivityIndicator size="large" testID="permission-loading" /></View>;
  }
  const gallery = { label: ro.capture.gallery, onPress: () => { void pickFromGallery(); } };
  const cameraActive = permission.granted && !mountFailed;

  return (
    <View style={styles.root}>
      {cameraActive ? (
        <>
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} onMountError={() => setMountFailed(true)} />
          <Text style={styles.hint}>{ro.capture.hint}</Text>
          <View style={styles.controls}>
            <ActionButton {...gallery} disabled={working} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ro.capture.shutter}
              accessibilityState={{ disabled: !ready || working }}
              disabled={!ready || working}
              onPress={() => { void takePhoto(camera.current); }}
              style={[styles.shutter, (!ready || working) && styles.shutterOff]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </>
      ) : state.status === 'idle' ? (
        <ScrollView testID="capture-permission-recovery" style={{ flex: 1 }} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          {!permission.granted ? (
            <StatusPanel
              title={ro.capture.deniedTitle}
              message={ro.capture.deniedText}
              actions={[gallery, { label: ro.capture.openSettings, onPress: () => { void Linking.openSettings(); } }, { label: ro.capture.retry, onPress: () => { void requestPermission(); } }]}
            />
          ) : (
            <StatusPanel
              message={ro.errors.generic}
              actions={[gallery, { label: ro.errors.retry, onPress: () => { setMountFailed(false); setReady(false); } }]}
            />
          )}
        </ScrollView>
      ) : null}
      {working ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}><ActivityIndicator size="large" color={colors.cameraInk} /><Text style={styles.overlayText}>{ro.capture.working}</Text></View>
      ) : null}
      {state.status === 'error' || state.status === 'offline' ? (
        <ScrollView testID="capture-error-recovery" style={StyleSheet.absoluteFill} contentContainerStyle={[styles.overlay, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          <StatusPanel
            title={state.status === 'offline' ? ro.offline.title : undefined}
            message={state.status === 'offline' ? ro.offline.subtitle : errorMessage(state.code)}
            actions={[
              ...(canRetry ? [{ label: state.status === 'offline' ? ro.offline.retry : ro.errors.retry, onPress: () => { void retry(); } }] : []),
              gallery,
              { label: ro.nav.close, onPress: dismiss },
            ]}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cameraBackground },
  center: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hint: { position: 'absolute', top: 24, left: 16, right: 16, color: colors.cameraInk, fontSize: 16, textAlign: 'center' },
  controls: { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.cameraInk, alignItems: 'center', justifyContent: 'center' },
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.cameraInk },
  overlay: { backgroundColor: colors.cameraOverlay, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  overlayText: { color: colors.cameraInk, fontSize: 16 },
});
