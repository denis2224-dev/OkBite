import { View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { radii } from '../theme/tokens';
import { tierTone } from '../theme/tierTones';

const order: Tier[] = ['excellent', 'good', 'fair', 'poor', 'bad'];

/** One pill segment per tier that has products, sized by count, 4 pt apart. No legend: `label` reads the counts. */
export function SegmentedScoreBar({ mix, label }: { mix: Record<Tier, number>; label: string }) {
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ flexDirection: 'row', height: 10, gap: 4 }}>
    {order.filter(tier => mix[tier] > 0).map(tier => <View key={tier} testID={`seg-${tier}`} style={{ flexGrow: mix[tier], borderRadius: radii.pill, backgroundColor: tierTone(tier).fill }} />)}
  </View>;
}
