import { View } from 'react-native';
import type { ScoreResult } from '@okbite/shared';
import { Body, Card, Heading, ScoreRing } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';

export function ScoreCard({ score }: { score: ScoreResult }) {
  const { colors } = useTheme();
  const unavailable = score.score === null || score.grade === 'unavailable';
  return <Card>
    <Heading style={{ fontSize: 18 }}>{ro.score.title}</Heading>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <ScoreRing score={unavailable ? null : score.score} grade={unavailable ? 'unavailable' : score.grade} />
      {!unavailable && <NutriScoreScale letter={score.letter} />}
    </View>
    <Body style={{ fontWeight: '700' }}>{unavailable ? ro.result.scoreUnavailable : ro.score[score.grade]}</Body>
    {unavailable ? <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </> : score.reasons.map((reason, index) => <View key={index} style={{ gap: 4 }}>
      <Body style={{ color: reason.tone === 'bad' ? colors.low : reason.tone === 'good' ? colors.good : colors.muted }}>
        {reason.tone === 'good' ? ro.score.positive : reason.tone === 'bad' ? ro.score.negative : ro.score.neutral}
      </Body>
      <Body style={{ fontWeight: '700' }}>{reason.title}</Body><Body>{reason.detail}</Body>
    </View>)}
    <Body style={{ color: colors.muted }}>{ro.score.disclaimer}</Body>
  </Card>;
}
