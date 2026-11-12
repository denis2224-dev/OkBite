import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { ro } from '../../copy/ro';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { StatusPanel } from '../capture/StatusPanel';

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
  return <View style={styles.actions}>
    {permission?.granted && !failed && focused && active ? <>
      <View style={[styles.preview, { backgroundColor: colors.cameraBackground }]}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} onMountError={() => setFailed(true)} />
        {ready && <View pointerEvents="none" aria-hidden style={[styles.frame, { borderColor: colors.accent }]} />}
      </View>
      <Button icon="camera" disabled={!ready || disabled || busy} onPress={() => { void run(async () => (await camera.current?.takePictureAsync())?.uri ?? null); }}>
        {ro.capture.shutter}
      </Button>
    </> : <StatusPanel message={failed ? ro.pwa.camera.unavailable : ro.capture.deniedText} actions={[
      { label: ro.capture.retry, onPress: () => { setFailed(false); void request().catch(() => setFailed(true)); } },
    ]} />}
    <Button variant="secondary" disabled={disabled || busy} onPress={() => { void run(async () => {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      return result.canceled ? null : result.assets[0]?.uri ?? null;
    }); }}>
      {ro.add.gallery}
    </Button>
  </View>;
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
  preview: {
    width: '100%', aspectRatio: 1.15, maxHeight: 340, borderRadius: radii.hero, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  frame: { width: '84%', height: '76%', borderWidth: 2, borderStyle: 'dashed', borderRadius: radii.small },
});
