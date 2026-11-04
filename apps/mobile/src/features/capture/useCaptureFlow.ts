import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { LookupResponse, IdentifyResponse } from '@okbite/shared';
import { api } from '../../lib/api';
import { compressPhoto } from './compressPhoto';
import { findBarcode } from './findBarcode';

export type CaptureState = 'idle' | 'working' | 'offline' | 'error';

export function useCaptureFlow() {
  const router = useRouter();
  const [state, setState] = useState<CaptureState>('idle');
  const busyRef = useRef(false);

  const processUri = useCallback(async (rawUri: string): Promise<string | null> => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setState('working');
    try {
      const compressed = await compressPhoto(rawUri);
      const code = await findBarcode(compressed.uri);
      if (code) {
        const lookupRes = LookupResponse.parse(await api.lookup({ code }));
        if (lookupRes.status === 'found') {
          setState('idle');
          router.replace(`/product/${lookupRes.product.id}`);
          return 'found';
        }
      }
      const identifyRes = IdentifyResponse.parse(await api.identify(compressed.base64));
      setState('idle');
      if (identifyRes.status === 'found') router.replace(`/product/${identifyRes.product.id}`);
      else router.replace({ pathname: '/identify', params: { payload: JSON.stringify(identifyRes) } });
      return identifyRes.status;
    } catch (err) {
      // shortcut: offline queue enqueue({ kind: 'photo', uri }) awaits R4 Task B6 (Step 2c)
      const next = (err as { code?: string })?.code === 'offline' ? 'offline' : 'error';
      setState(next);
      return next;
    } finally {
      busyRef.current = false;
    }
  }, [router]);

  const takePhoto = useCallback(async (camera: { takePictureAsync?: () => Promise<{ uri?: string } | undefined> } | null) => {
    if (!camera?.takePictureAsync || busyRef.current) return null;
    const photo = await camera.takePictureAsync();
    return photo?.uri ? processUri(photo.uri) : null;
  }, [processUri]);

  const pickFromGallery = useCallback(async () => {
    if (busyRef.current) return null;
    const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    return !picked.canceled && picked.assets?.[0]?.uri ? processUri(picked.assets[0].uri) : null;
  }, [processUri]);

  return { state, takePhoto, pickFromGallery, processUri };
}
