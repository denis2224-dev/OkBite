import React, { useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ro } from '../src/copy/ro';
import { useCaptureFlow } from '../src/features/capture/useCaptureFlow';

export function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<{ takePictureAsync?: () => Promise<{ uri?: string } | undefined> } | null>(null);
  const { state, takePhoto, pickFromGallery } = useCaptureFlow();

  if (state === 'working') return <View><ActivityIndicator /><Text>{ro.capture.working}</Text></View>;
  if (permission && !permission.granted) {
    return (
      <View>
        <Text accessibilityRole="header">{ro.capture.deniedTitle}</Text>
        <Text>{ro.capture.deniedText}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.gallery} onPress={pickFromGallery}><Text>{ro.capture.gallery}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.openSettings} onPress={() => Linking.openSettings()}><Text>{ro.capture.openSettings}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.retry} onPress={() => requestPermission()}><Text>{ro.capture.retry}</Text></Pressable>
      </View>
    );
  }
  return (
    <View>
      <CameraView ref={cameraRef as never} />
      <Text>{ro.capture.hint}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.shutter} onPress={() => takePhoto(cameraRef.current)} />
      <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.gallery} onPress={pickFromGallery}><Text>{ro.capture.gallery}</Text></Pressable>
    </View>
  );
}

export default CaptureScreen;
