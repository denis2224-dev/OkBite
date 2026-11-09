import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ActionButton } from '../capture/StatusPanel';
import type { GuidedPhotoCaptureProps } from './GuidedPhotoCapture';
export type { GuidedPhotoCaptureProps } from './GuidedPhotoCapture';

export function GuidedPhotoCapture({ onCapture, disabled = false }: GuidedPhotoCaptureProps) {
  const { colors } = useTheme();
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const picked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget, file = input.files?.[0];
    if (!file || disabled || busy) return;
    const uri = URL.createObjectURL(file);
    setBusy(true); setFailed(false);
    try { await onCapture(uri); }
    catch { setFailed(true); }
    finally { URL.revokeObjectURL(uri); input.value = ''; setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <input ref={camera} type="file" accept="image/*" capture="environment" aria-label={ro.capture.shutter} style={{ display: 'none' }} onChange={event => { void picked(event); }} />
    <input ref={gallery} type="file" accept="image/*" aria-label={ro.add.gallery} style={{ display: 'none' }} onChange={event => { void picked(event); }} />
    <ActionButton label={ro.capture.shutter} disabled={disabled || busy} onPress={() => camera.current?.click()} />
    <ActionButton label={ro.add.gallery} disabled={disabled || busy} onPress={() => gallery.current?.click()} />
    {failed ? <Text accessibilityRole="alert" style={{ color: colors.ink }}>{ro.errors.generic}</Text> : null}
  </View>;
}
