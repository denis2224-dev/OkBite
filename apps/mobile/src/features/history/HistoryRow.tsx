import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
import { useTheme } from '../../theme/useTheme';

type Props = { imageUrl: string | null; score: number | null; tier: Tier | null; unavailableText?: string };

/** What a History row shows: the product photo on the left, then the rating with the verdict under it. Nothing else. */
export function HistoryRow({ imageUrl, score, tier, unavailableText }: Props) {
  const { colors } = useTheme();
  // A photo that fails to load falls back to the neutral tile instead of leaving a hole.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = imageUrl && imageUrl !== failedUrl ? imageUrl : null;
  const tone = score !== null && tier ? tierTone(tier) : null;
  return <View style={styles.row}>
    {photo
      ? <Image testID="history-photo" source={{ uri: photo }} accessible={false} resizeMode="contain" onError={() => setFailedUrl(photo)}
          style={[styles.photo, { backgroundColor: colors.mint }]} />
      : <View testID="history-photo-tile" style={[styles.photo, { backgroundColor: colors.mint }]} />}
    <View style={styles.text}>
      {score !== null && tier && tone
        ? <>
          <Text style={[styles.score, { color: tone.fg }]}>{score}</Text>
          <Text style={[styles.verdict, { color: tone.fg }]}>{ro.tiers[tier]}</Text>
        </>
        : <Text style={[styles.verdict, { color: colors.muted }]}>{unavailableText ?? ro.history.noScore}</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  photo: { width: 68, height: 68, borderRadius: 14 },
  text: { flex: 1, minWidth: 0, gap: 4 },
  score: { fontFamily: fonts.headingExtra, fontSize: 24, lineHeight: 26 },
  verdict: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
});
