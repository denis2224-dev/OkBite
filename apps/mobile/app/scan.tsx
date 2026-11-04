import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useRouter } from 'expo-router';
import { normalizeCode, LookupResponse } from '@okbite/shared';
import { api } from '../src/lib/api';
import { ro } from '../src/copy/ro';
import { ManualCode } from '../src/features/scan/ManualCode';

export function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const busyRef = useRef(false);
  const handleCode = useCallback(async (raw: string, fromCamera = false) => {
    const code = busyRef.current ? null : normalizeCode(raw);
    if (!code) return;
    busyRef.current = true;
    try {
      if (fromCamera) await notificationAsync(NotificationFeedbackType.Success).catch(() => undefined);
      const res = LookupResponse.parse(await api.lookup({ code }));
      if (res.status === 'found') router.replace(`/product/${res.product.id}`);
      else router.replace({ pathname: '/identify', params: { payload: JSON.stringify({ status: 'not_found', read: { brand: null, name: null, quantity: null, code }, photoPath: '' }) } });
    } finally { busyRef.current = false; }
  }, [router]);

  return (
    <View>
      <Text accessibilityRole="header">{ro.scan.title}</Text>
      {permission && !permission.granted ? (
        <View>
          <Text>{ro.scan.deniedText}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.openSettings} onPress={() => Linking.openSettings()}><Text>{ro.capture.openSettings}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={ro.capture.retry} onPress={() => requestPermission()}><Text>{ro.capture.retry}</Text></Pressable>
        </View>
      ) : (
        <View>
          <CameraView barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }} onBarcodeScanned={({ data }: { data: string }) => handleCode(data, true)} />
          <Text>{ro.scan.frameHint}</Text>
        </View>
      )}
      <ManualCode onSubmit={(code) => handleCode(code, false)} />
    </View>
  );
}

export default ScanScreen;
