import { useState } from 'react';
import { Linking, Modal, ScrollView, View } from 'react-native';
import type { Ingredient } from '@okbite/shared';
import { Body, Button, Card, Heading } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { getLanguage } from '../../copy/lang';
import { ReportSheet } from './ReportSheet';

// The E-number from the knowledge-base slug ("aspartam-e951" -> "E951"), shown when the name lacks it.
function eNumber({ slug, name }: Ingredient): string | null {
  const digits = slug?.match(/-e(\d{3}[a-z]?)$/)?.[1];
  return digits && !name.toUpperCase().includes(`E${digits.toUpperCase()}`) ? `E${digits}` : null;
}

function RiskChip({ risk }: { risk: Ingredient['risk'] }) {
  const { colors } = useTheme();
  const [fg, bg] = risk === 'high' ? [colors.low, colors.lowBg] : risk === 'moderate' ? [colors.medium, colors.mediumBg]
    : risk === 'low' ? [colors.good, colors.goodBg] : [colors.neutral, colors.neutralBg];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 }}>
    <Body style={{ fontSize: 13, lineHeight: 19, color: fg }}>{risk ? ro.additives[risk] : ro.additives.notAssessed}</Body>
  </View>;
}

/** Detail sheet for one additive; N12 opens it from the result's additive list. */
export function AdditiveSheet({ ingredient, productId, onClose }: { ingredient: Ingredient; productId: string; onClose: () => void }) {
  const { colors } = useTheme();
  const [report, setReport] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const code = eNumber(ingredient);
  async function open(url: string) {
    setLinkFailed(false);
    try { await Linking.openURL(url); } catch { setLinkFailed(true); }
  }
  if (report) return <ReportSheet productId={productId} onClose={() => setReport(false)} />;
  return <Modal transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <Heading>{ingredient.name}</Heading>
            {code && <Body style={{ color: colors.muted }}>{code}</Body>}
            {ingredient.role && <Body>{`${ro.additives.role}: ${ingredient.role}`}</Body>}
            <RiskChip risk={ingredient.risk} />
            <Body>{ingredient.explanation ?? ro.ingredients.explanationSoon}</Body>
            {ingredient.explanation && getLanguage() === 'en' && <Body style={{ color: colors.muted }}>{ro.additives.romanianOnly}</Body>}
            {ingredient.riskSource && <Button variant="secondary" onPress={() => open(ingredient.riskSource!)}>{ro.additives.source}</Button>}
            {ingredient.source && <Button variant="secondary" onPress={() => open(ingredient.source!)}>{ro.additives.explanationSource}</Button>}
            {linkFailed && <Body accessibilityLiveRegion="polite" style={{ color: colors.low }}>{ro.errors.generic}</Body>}
            <Button variant="ghost" onPress={() => setReport(true)}>{ro.result.report}</Button>
            <Button onPress={onClose}>{ro.app.close}</Button>
          </Card>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
