import React, { useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeCode, LookupResponse } from '@okbite/shared';
import { api } from '../src/lib/api';
import { ro } from '../src/copy/ro';
import { ManualCode } from '../src/features/scan/ManualCode';

export function ScanWebScreen() {
  const router = useRouter();
  const busyRef = useRef(false);
  const hasDetector = typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis;
  const handleCode = useCallback(async (raw: string) => {
    const code = busyRef.current ? null : normalizeCode(raw);
    if (!code) return;
    busyRef.current = true;
    try {
      const res = LookupResponse.parse(await api.lookup({ code }));
      if (res.status === 'found') router.replace(`/product/${res.product.id}`);
      else router.replace({ pathname: '/identify', params: { payload: JSON.stringify({ status: 'not_found', read: { brand: null, name: null, quantity: null, code }, photoPath: '' }) } });
    } finally { busyRef.current = false; }
  }, [router]);

  return (
    <View>
      <Text accessibilityRole="header">{ro.scan.title}</Text>
      <Text>{hasDetector ? ro.scan.frameHint : ro.scan.webManualOnly}</Text>
      <ManualCode onSubmit={handleCode} />
    </View>
  );
}

export default ScanWebScreen;
