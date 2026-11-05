import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ro } from '../../copy/ro';
import { ActionButton, StatusPanel, errorMessage } from './StatusPanel';
import { useCaptureFlow } from './useCaptureFlow';

export default function CaptureScreen() {
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
        <View style={styles.center}>
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
        </View>
      ) : null}
      {working ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}><ActivityIndicator size="large" color="#fff" /><Text style={styles.overlayText}>{ro.capture.working}</Text></View>
      ) : null}
      {state.status === 'error' || state.status === 'offline' ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <StatusPanel
            title={state.status === 'offline' ? ro.offline.title : undefined}
            message={state.status === 'offline' ? ro.offline.subtitle : errorMessage(state.code)}
            actions={[
              ...(canRetry ? [{ label: state.status === 'offline' ? ro.offline.retry : ro.errors.retry, onPress: () => { void retry(); } }] : []),
              gallery,
              { label: ro.nav.close, onPress: dismiss },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  hint: { position: 'absolute', top: 24, left: 16, right: 16, color: '#fff', fontSize: 16, textAlign: 'center' },
  controls: { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  overlayText: { color: '#fff', fontSize: 16 },
});
