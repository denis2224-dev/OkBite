import { View } from 'react-native';
import type { ScoreReason, ScoreResult } from '@okbite/shared';
import { Body, Caption, Card } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { teaspoons } from './portion';
import { ResultIcon } from './ResultIcon';

const rank: Record<ScoreReason['tone'], number> = { bad: 0, neutral: 1, good: 2 };
// Reasons come from the score in Romanian; only a sugar problem gets the teaspoon helper.
const isSugarProblem = (reason: ScoreReason) => reason.tone !== 'good' && /zah[aă]r/i.test(reason.title);

/** The score's own reasons (at most 3), problems first, right under the score. No new numbers. */
export function WhyScore({ score, sugar }: { score: ScoreResult; sugar: number | null }) {
  const { colors } = useTheme();
  const reasons = [...score.reasons].sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 3);
  if (!reasons.length) return null;
  return <View>
    <Card testID="reasons-card" style={{ paddingVertical: 4, gap: 0 }}>
      {reasons.map((reason, index) => {
        const tone = reason.tone === 'good' ? { fg: colors.primary, label: ro.score.positive }
          : reason.tone === 'bad' ? { fg: colors.muted, label: ro.score.negative } : { fg: colors.muted, label: ro.score.neutral };
        const spoons = sugar !== null && isSugarProblem(reason) ? `≈ ${teaspoons(sugar)}` : null;
        // The +/- icon shows the tone; the word is only read aloud.
        return <View key={index} accessible accessibilityLabel={`${tone.label}: ${reason.title}. ${reason.detail}${spoons ? `. ${spoons}` : ''}`}
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderColor: colors.divider }}>
          <View testID={`reason-tone-${reason.tone}`}><ResultIcon name={reason.tone === 'good' ? 'plus' : 'minus'} color={tone.fg} /></View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Body style={{ fontFamily: fonts.bold }}>{reason.title}</Body>
            <Caption>{reason.detail}</Caption>
            {spoons && <Caption>{spoons}</Caption>}
          </View>
        </View>;
      })}
    </Card>
  </View>;
}
