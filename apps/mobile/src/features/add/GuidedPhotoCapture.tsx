import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ActionButton, StatusPanel } from '../capture/StatusPanel';

export type GuidedPhotoCaptureProps = { onCapture: (uri: string) => Promise<void>; disabled?: boolean };
export function GuidedPhotoCapture({ onCapture, disabled = false }: GuidedPhotoCaptureProps) {
  const { colors } = useTheme();
  const [permission, request] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); setReady(false); }; }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => { setActive(value === 'active'); setReady(false); });
    return () => subscription.remove();
  }, []);
  const run = async (getUri: () => Promise<string | null>) => {
    if (disabled || busy) return;
    setBusy(true);
    try { const uri = await getUri(); if (uri) await onCapture(uri); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    {permission?.granted && !failed && focused && active ? <>
      <View style={{ height: 300, backgroundColor: colors.cameraBackground }}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} onMountError={() => setFailed(true)} />
      </View>
      <ActionButton label={ro.capture.shutter} disabled={!ready || disabled || busy} onPress={() => { void run(async () => (await camera.current?.takePictureAsync())?.uri ?? null); }} />
    </> : <StatusPanel message={failed ? ro.pwa.camera.unavailable : ro.capture.deniedText} actions={[
      { label: ro.capture.retry, onPress: () => { setFailed(false); void request().catch(() => setFailed(true)); } },
    ]} />}
    <ActionButton label={ro.add.gallery} disabled={disabled || busy} onPress={() => { void run(async () => {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      return result.canceled ? null : result.assets[0]?.uri ?? null;
    }); }} />
  </View>;
}
