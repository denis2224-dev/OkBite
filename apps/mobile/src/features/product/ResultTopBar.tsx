import { View } from 'react-native';
import { IconCircleButton } from '../../ui';
import { ro } from '../../copy/ro';

/** Share (hidden in the preview) and report as raised circles on the right. No back arrow: swipe from the left edge goes back. */
export function ResultTopBar({ onShare, sharing, onReport }: { onShare?: () => void; sharing: boolean; onReport: () => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
    {onShare && <IconCircleButton icon="share" label={ro.share.button} disabled={sharing} onPress={onShare} />}
    <IconCircleButton icon="flag" label={ro.result.report} onPress={onReport} />
  </View>;
}
