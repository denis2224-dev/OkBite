import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ro } from '../copy/ro';
import { INSTALL_AFTER_RESULTS, useInstallDismissal, useInstallPrompt, useResultsOpened } from '../lib/installPrompt';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { fonts, spacing } from '../theme/tokens';
import { Card } from './Card';
import { Body, Heading } from './Typography';
import { Button } from './Button';
import { Icon } from './Icon';

/** Banner docked below the screen content once two product results were opened; iOS guidance opens as a bottom sheet on request. */
export function InstallPrompt() {
  const { canInstall, isIos, isStandalone, install, failed, installing, sheetOpen, openSheet, closeSheet } = useInstallPrompt();
  const [dismissed, dismiss] = useInstallDismissal();
  const opened = useResultsOpened();
  const { colors } = useTheme();
  const close = () => { dismiss(); closeSheet(); };
  const startInstall = async () => { if ((await install()) === null) openSheet(); else closeSheet(); };
  if (isStandalone || (!sheetOpen && (dismissed || opened < INSTALL_AFTER_RESULTS || (!canInstall && !isIos && !failed)))) return null;
  if (!sheetOpen) return <View testID="install-banner" style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={s.row}>
      <Body style={[s.bannerTitle, { color: colors.ink }]}>{ro.pwa.install.title}</Body>
      {(canInstall || isIos) && <Button disabled={installing} onPress={isIos ? openSheet : startInstall} style={s.action}>{ro.pwa.install.action}</Button>}
      <Pressable accessibilityRole="button" accessibilityLabel={ro.app.close} onPress={close} style={s.close}><Icon name="close" color={colors.muted} /></Pressable>
    </View>
    {failed && <Body accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.low }}>{ro.pwa.install.failed}</Body>}
  </View>;
  return <Modal accessibilityLabel={ro.pwa.install.title} transparent animationType="none" onRequestClose={close}>
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[s.overlay, { backgroundColor: colors.scrim }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        <Card testID="install-sheet" accessibilityViewIsModal style={s.sheet}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <View style={[s.icon, { backgroundColor: colors.mint }]}><Icon name="home" size={30} color={colors.primary} /></View>
          <Heading style={s.title}>{ro.pwa.install.title}</Heading>
          {isIos && <View style={[s.steps, { backgroundColor: colors.ground, borderColor: colors.border }]}>
            <View style={s.stepIcons}><Icon name="share" color={colors.primary} /><Icon name="arrow" color={colors.muted} /><Icon name="home" color={colors.primary} /></View>
            <Body>{ro.pwa.install.iosHint}</Body>
          </View>}
          {failed && <Body accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.low }}>{ro.pwa.install.failed}</Body>}
          {canInstall && <Button icon="home" disabled={installing} onPress={startInstall}>{ro.pwa.install.action}</Button>}
          <Button variant="ghost" onPress={close}>{ro.app.close}</Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  banner: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, borderTopWidth: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  bannerTitle: { flexGrow: 1, flexShrink: 1, flexBasis: 120, fontFamily: fonts.bold },
  action: { minHeight: 44, paddingVertical: spacing.sm },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 480, alignSelf: 'center', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  icon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  steps: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1 },
  stepIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
