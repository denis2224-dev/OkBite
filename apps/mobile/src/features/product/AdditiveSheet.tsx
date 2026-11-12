import { useState } from 'react';
import { Linking, Modal, ScrollView, View } from 'react-native';
import type { Ingredient } from '@okbite/shared';
import { Body, Button, Card, Heading, Icon } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { getLanguage } from '../../copy/lang';
import { ReportSheet } from './ReportSheet';

// "E129 · Colorant" above the name, as in the mockup. The E-number comes from the knowledge-base
// slug ("aspartam-e951" -> "E951") and is left out when the name or role already shows it.
function eyebrow({ slug, name, role }: Ingredient): string {
  const digits = slug?.match(/-e(\d{3}[a-z]?)$/)?.[1];
  const shown = `${name} ${role ?? ''}`.toUpperCase();
  const code = digits && !shown.includes(`E${digits.toUpperCase()}`) ? `E${digits}` : null;
  return [code, role].filter(Boolean).join(' · ');
}

function RiskChip({ risk }: { risk: Ingredient['risk'] }) {
  const { colors } = useTheme();
  const [fg, bg] = risk === 'high' ? [colors.low, colors.lowBg] : risk === 'moderate' ? [colors.medium, colors.mediumBg]
    : risk === 'low' ? [colors.good, colors.goodBg] : [colors.neutral, colors.neutralBg];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
    <Body style={{ fontSize: 13, lineHeight: 19, fontFamily: fonts.bold, color: fg }}>{risk ? ro.additives[risk] : ro.additives.notAssessed}</Body>
  </View>;
}

function SourceLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}>
    <Body style={{ fontFamily: fonts.bold, color: colors.primary }}>{`${label} ›`}</Body>
  </PressableOpacity>;
}

/** Detail sheet for one additive; N12 opens it from the result's additive list. */
export function AdditiveSheet({ ingredient, productId, onClose }: { ingredient: Ingredient; productId: string; onClose: () => void }) {
  const { colors } = useTheme();
  const [report, setReport] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const top = eyebrow(ingredient);
  async function open(url: string) {
    setLinkFailed(false);
    try { await Linking.openURL(url); } catch { setLinkFailed(true); }
  }
  if (report) return <ReportSheet productId={productId} onClose={() => setReport(false)} />;
  return <Modal transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16, padding: 20, paddingBottom: 28, backgroundColor: colors.ground, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              {!!top && <Body style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.muted }}>{top}</Body>}
              <Heading>{ingredient.name}</Heading>
            </View>
            <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.app.close} onPress={onClose}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
              <Icon name="close" size={18} color={colors.ink} />
            </PressableOpacity>
          </View>
          <RiskChip risk={ingredient.risk} />
          <Card>
            <Body>{ingredient.explanation ?? ro.ingredients.explanationSoon}</Body>
            {ingredient.explanation && getLanguage() === 'en' && <Body style={{ color: colors.muted }}>{ro.additives.romanianOnly}</Body>}
          </Card>
          {ingredient.riskSource && <SourceLink label={ro.additives.source} onPress={() => open(ingredient.riskSource!)} />}
          {ingredient.source && <SourceLink label={ro.additives.explanationSource} onPress={() => open(ingredient.source!)} />}
          {linkFailed && <Body accessibilityLiveRegion="polite" style={{ color: colors.low }}>{ro.errors.generic}</Body>}
          <Button variant="secondary" onPress={() => setReport(true)}>{ro.result.report}</Button>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
