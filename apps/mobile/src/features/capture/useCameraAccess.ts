import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { ro } from '../../copy/ro';
import type { PanelAction } from './StatusPanel';

export function useCameraAccess() {
  const [permission, request] = useCameraPermissions({ request: false, get: false });
  const [message, setMessage] = useState<string>();
  const requestPermission = useCallback(async () => {
    try { await request(); setMessage(undefined); }
    catch { setMessage(ro.pwa.camera.unavailable); }
  }, [request]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return request(); })
      .catch(() => { if (!cancelled) setMessage(ro.pwa.camera.unavailable); });
    return () => { cancelled = true; };
  }, [request]);
  const settingsAction: PanelAction | undefined = {
    label: ro.capture.openSettings,
    onPress: () => { void (async () => {
      try { await Linking.openSettings(); }
      catch { setMessage(ro.pwa.camera.settingsFailed); }
    })(); },
  };
  return { permission: permission ?? (message ? { granted: false, status: 'denied' } : null), requestPermission, settingsAction, message, canRetry: true };
}
