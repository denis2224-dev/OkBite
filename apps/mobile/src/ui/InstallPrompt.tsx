import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ro } from '../copy/ro';
import { useInstallDismissal, useInstallPrompt } from '../lib/installPrompt';
import { useTheme } from '../theme/useTheme';
import { Card } from './Card';
import { Body, Heading } from './Typography';
import { Button } from './Button';
import { Icon } from './Icon';

export function InstallPrompt() {
  const { canInstall, isIos, isStandalone, install, failed, installing, sheetOpen, openSheet, closeSheet } = useInstallPrompt();
  const [dismissed, dismiss] = useInstallDismissal();
  const { colors } = useTheme();
  const close = () => { dismiss(); closeSheet(); };
  const startInstall = async () => { if ((await install()) === null) openSheet(); else closeSheet(); };
  if (isStandalone || (!sheetOpen && (dismissed || (!canInstall && !isIos && !failed)))) return null;
  if (!sheetOpen) return <Card>
    <Heading style={s.invitationTitle}>{ro.pwa.install.title}</Heading>
    <Body>{ro.pwa.install.description}</Body>
    <Button icon="home" disabled={installing} onPress={isIos ? openSheet : startInstall}>{ro.pwa.install.title}</Button>
    <Button variant="ghost" onPress={close}>{ro.app.close}</Button>
  </Card>;
  return <Modal accessibilityLabel={ro.pwa.install.title} transparent animationType="none" onRequestClose={close}>
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[s.overlay, { backgroundColor: colors.scrim }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        <Card accessibilityLabel={ro.pwa.install.description} accessibilityViewIsModal style={s.sheet}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <View style={[s.icon, { backgroundColor: colors.mint }]}><Icon name="home" size={30} color={colors.primary} /></View>
          <Heading style={s.title}>{ro.pwa.install.title}</Heading>
          <Body style={[s.description, { color: colors.muted }]}>{ro.pwa.install.description}</Body>
          {isIos && <View style={[s.steps, { backgroundColor: colors.ground, borderColor: colors.border }]}>
            <View style={s.stepIcons}><Icon name="share" color={colors.primary} /><Icon name="arrow" color={colors.muted} /><Icon name="home" color={colors.primary} /></View>
            <Body>{ro.pwa.install.iosHint}</Body>
          </View>}
          {failed && <Body accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.low }}>{ro.pwa.install.failed}</Body>}
          {canInstall && <Button icon="home" disabled={installing} onPress={startInstall}>{ro.pwa.install.title}</Button>}
          <Button variant="ghost" onPress={close}>{ro.app.close}</Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  invitationTitle: { fontSize: 20 },
  overlay: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 480, alignSelf: 'center', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  icon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  description: { textAlign: 'center' },
  steps: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1 },
  stepIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
