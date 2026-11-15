import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { Icon } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { ResultIcon } from './ResultIcon';

function IconButton({ label, disabled, onPress, children }: { label: string; disabled?: boolean; onPress: () => void; children: ReactNode }) {
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, opacity: disabled ? 0.45 : 1 }}>{children}</PressableOpacity>;
}

/** Collapse on the left; share (hidden in the preview) and report on the right. */
export function ResultTopBar({ onShare, sharing, onReport }: { onShare?: () => void; sharing: boolean; onReport: () => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <IconButton label={ro.result.closeSheet} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
      <ResultIcon name="chevronDown" size={26} color={colors.ink} />
    </IconButton>
    <View style={{ flex: 1 }} />
    {onShare && <IconButton label={ro.share.button} disabled={sharing} onPress={onShare}><Icon name="share" size={24} color={colors.ink} /></IconButton>}
    <IconButton label={ro.result.report} onPress={onReport}><ResultIcon name="flag" size={24} color={colors.ink} /></IconButton>
  </View>;
}
