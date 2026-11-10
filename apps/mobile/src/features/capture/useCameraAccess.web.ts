import { useCallback, useEffect, useRef, useState } from 'react';
import { cameraAvailability, cameraFailure, cameraMessage } from './cameraSupport.web';

export function useCameraAccess() {
  const [permission, setPermission] = useState<{ granted: boolean; status: 'granted' | 'denied' } | null>(null);
  const [message, setMessage] = useState<string>();
  const active = useRef(false), pending = useRef(false), latest = useRef<symbol>(Symbol());
  const requestPermission = useCallback(async () => {
    if (!active.current || pending.current) return;
    const issue = cameraAvailability();
    if (issue) { setMessage(cameraMessage(issue)); setPermission({ granted: false, status: 'denied' }); return; }
    pending.current = true;
    const id = Symbol();
    latest.current = id;
    setPermission(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      // This stream only checks permission; CameraView owns the actual preview stream.
      stream.getTracks().forEach(track => track.stop());
      if (active.current && id === latest.current) {
        setMessage(undefined); setPermission({ granted: true, status: 'granted' });
      }
    } catch (error) {
      if (active.current && id === latest.current) {
        setMessage(cameraMessage(cameraFailure(error))); setPermission({ granted: false, status: 'denied' });
      }
    } finally { if (id === latest.current) pending.current = false; }
  }, []);
  useEffect(() => {
    active.current = true;
    // Start the external request asynchronously; skip it if navigation already unmounted us.
    void Promise.resolve().then(requestPermission);
    return () => { active.current = false; pending.current = false; latest.current = Symbol(); };
  }, [requestPermission]);
  return { permission, requestPermission, settingsAction: undefined, message, canRetry: !cameraAvailability() };
}
