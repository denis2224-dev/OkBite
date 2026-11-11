import { View } from 'react-native';
import type { ScoreResult } from '@okbite/shared';
import { Body, Card, Heading, Icon, ScoreRing } from '../../ui';
import { fonts } from '../../theme/tokens';
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
    <Body style={{ fontFamily: fonts.bold }}>{unavailable ? ro.result.scoreUnavailable : ro.score[score.grade]}</Body>
    {unavailable ? <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </> : score.reasons.map((reason, index) => {
      const tone = reason.tone === 'good' ? { fg: colors.good, bg: colors.goodBg, icon: 'check' as const, label: ro.score.positive }
        : reason.tone === 'bad' ? { fg: colors.low, bg: colors.lowBg, icon: 'alert' as const, label: ro.score.negative }
        : { fg: colors.neutral, bg: colors.neutralBg, icon: 'info' as const, label: ro.score.neutral };
      return <View key={index} style={{ gap: 4, paddingTop: index ? 12 : 0, borderTopWidth: index ? 1 : 0, borderColor: colors.divider }}>
        <View testID={`reason-tone-${reason.tone}`} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tone.bg }}>
          <Icon name={tone.icon} size={14} color={tone.fg} />
          <Body style={{ fontSize: 13, lineHeight: 19, fontFamily: fonts.bold, color: tone.fg }}>{tone.label}</Body>
        </View>
        <Body style={{ fontFamily: fonts.bold }}>{reason.title}</Body><Body style={{ color: colors.muted }}>{reason.detail}</Body>
      </View>;
    })}
    <Body style={{ color: colors.muted }}>{ro.score.disclaimer}</Body>
  </Card>;
}
