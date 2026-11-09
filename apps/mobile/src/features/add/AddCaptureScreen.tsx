import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ro } from '../../copy/ro';
import { ActionButton, StatusPanel, errorMessage } from '../capture/StatusPanel';
import { useAddFlow } from './useAddFlow';

export function AddCaptureScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [mountFailed, setMountFailed] = useState(false);
  const { step, state, takePhoto, pickFromGallery, submitSamePhoto, retry, dismiss, canRetry } =
    useAddFlow();
  const working = state.status === 'working';

  if (!permission || permission.status === 'undetermined') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" testID="add-permission-loading" />
      </View>
    );
  }

  const gallery = { label: ro.add.gallery, onPress: () => { void pickFromGallery(); } };
  const cameraActive = permission.granted && !mountFailed;
  const stepTitle = step === 1 ? ro.add.ingredientsTitle : ro.add.nutritionTitle;
  const stepHint = step === 1 ? ro.add.ingredientsHint : ro.add.nutritionHint;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.stepBadge}>{ro.add.stepOf(step)}</Text>
        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.hint}>{stepHint}</Text>
        {step === 2 ? <Text style={styles.doneNote}>{ro.add.ingredientsDone}</Text> : null}
      </View>

      {cameraActive ? (
        <View style={styles.cameraArea}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
            onMountError={() => setMountFailed(true)}
          />
          <View style={styles.controls}>
            <ActionButton {...gallery} disabled={working} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ro.capture.shutter}
              accessibilityState={{ disabled: !ready || working }}
              disabled={!ready || working}
              onPress={() => {
                void takePhoto(camera.current);
              }}
              style={[styles.shutter, (!ready || working) && styles.shutterOff]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
            {step === 2 ? (
              <ActionButton
                label={ro.add.samePhoto}
                onPress={() => {
                  void submitSamePhoto();
                }}
                disabled={working}
              />
            ) : null}
          </View>
        </View>
      ) : state.status === 'idle' ? (
        <ScrollView testID="add-permission-recovery" style={{ flex: 1 }} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          {!permission.granted ? (
            <StatusPanel
              title={ro.capture.deniedTitle}
              message={ro.capture.deniedText}
              actions={[
                gallery,
                ...(step === 2
                  ? [{ label: ro.add.samePhoto, onPress: () => { void submitSamePhoto(); } }]
                  : []),
                { label: ro.capture.openSettings, onPress: () => { void Linking.openSettings(); } },
                { label: ro.capture.retry, onPress: () => { void requestPermission(); } },
              ]}
            />
          ) : (
            <StatusPanel
              message={ro.errors.generic}
              actions={[
                gallery,
                ...(step === 2
                  ? [{ label: ro.add.samePhoto, onPress: () => { void submitSamePhoto(); } }]
                  : []),
                {
                  label: ro.errors.retry,
                  onPress: () => {
                    setMountFailed(false);
                    setReady(false);
                  },
                },
              ]}
            />
          )}
        </ScrollView>
      ) : null}

      {working ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <ActivityIndicator size="large" color={colors.cameraInk} />
          <Text style={styles.overlayText}>{ro.add.reading}</Text>
        </View>
      ) : null}

      {state.status === 'error' || state.status === 'offline' ? (
        <ScrollView testID="add-error-recovery" style={StyleSheet.absoluteFill} contentContainerStyle={[styles.overlay, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          <StatusPanel
            title={state.status === 'offline' ? ro.offline.title : undefined}
            message={state.status === 'offline' ? ro.offline.subtitle : errorMessage(state.code)}
            actions={[
              ...(canRetry
                ? [
                    {
                      label: state.status === 'offline' ? ro.offline.retry : ro.errors.retry,
                      onPress: () => {
                        void retry();
                      },
                    },
                  ]
                : []),
              gallery,
              { label: ro.nav.close, onPress: dismiss },
            ]}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}

export default AddCaptureScreen;

const createStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cameraBackground },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, gap: 4, backgroundColor: colors.cameraPanel },
  stepBadge: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  title: { color: colors.cameraInk, fontSize: 18, fontWeight: '800' },
  hint: { color: colors.heroMuted, fontSize: 14 },
  doneNote: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  cameraArea: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  controls: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.cameraInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.cameraInk },
  overlay: {
    backgroundColor: colors.cameraOverlayStrong,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  overlayText: { color: colors.cameraInk, fontSize: 16, fontWeight: '600' },
});
