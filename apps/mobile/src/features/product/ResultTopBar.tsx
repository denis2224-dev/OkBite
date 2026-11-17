import { View } from 'react-native';
import { IconButton } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { ResultIcon } from './ResultIcon';

/** Back on the left (full page only), share (hidden in the preview) and report on the right. */
export function ResultTopBar({ onBack, onShare, sharing, onReport }: { onBack?: () => void; onShare?: () => void; sharing: boolean; onReport: () => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    {onBack && <IconButton icon="back" label={ro.app.back} onPress={onBack} />}
    <View style={{ flex: 1 }} />
    {onShare && <IconButton icon="share" label={ro.share.button} disabled={sharing} onPress={onShare} />}
    <IconButton label={ro.result.report} onPress={onReport}><ResultIcon name="flag" size={22} color={colors.primary} /></IconButton>
  </View>;
}
