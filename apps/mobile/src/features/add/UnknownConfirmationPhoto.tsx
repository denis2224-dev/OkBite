import React, { useEffect, useState } from 'react';
import { Image, Text } from 'react-native';
import { openPhoto } from '../offline/photos';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';

export function UnknownConfirmationPhoto({ id, label, disabled, onRetake }: {
  id: string | null; label: string; disabled: boolean; onRetake(): void;
}) {
  const { colors } = useTheme();
  const [photo, setPhoto] = useState<{ id: string; uri: string } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let release: (() => void) | undefined;

    if (id) void openPhoto(id).then(handle => {
      if (!active) { handle.release(); return; }
      release = handle.release;
      setPhoto({ id, uri: handle.uri });
    }).catch(() => { if (active) setFailedId(id); });
    return () => { active = false; release?.(); };
  }, [id]);
  if (!id) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${ro.add.retakePhoto}: ${label}`}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onRetake}
    style={{ gap: 8, minWidth: 104, flexBasis: 104, flexGrow: 1, maxWidth: '100%' }}>
    {photo?.id === id ? <Image source={{ uri: photo.uri }} accessible={false}
      style={{ width: '100%', height: 104, borderRadius: 12 }} resizeMode="contain" /> : null}
    <Text style={{ color: failedId === id ? colors.low : colors.muted, fontSize: 14 }}>{failedId === id ? ro.offline.photoMissing : label}</Text>
  </Pressable>;
}
