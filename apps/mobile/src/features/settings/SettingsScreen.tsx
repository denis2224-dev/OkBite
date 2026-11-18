import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type Language } from '../../copy/lang';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
import { HomePressable } from '../../shared/HomeChrome';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { goBack } from '../../shared/EdgeSwipeBack';
import { fonts, radii } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { Body, Button, Caption, Card, Icon, LinkRow, Screen, Section } from '../../ui';
import { useInstallPrompt } from '../../lib/installPrompt';
import { clearHistory } from '../history/store';

const languages: readonly Language[] = ['ro', 'ru', 'en'];
const infoIcons = { method: 'compare', privacy: 'info', terms: 'book' } as const;

export type SettingsScreenProps = {
  currentLanguage?: Language;
  setLanguage?: (language: Language) => void;
  resetOnboarding?: () => void;
  /** Shown as an alert at the top of the content, inside the safe area. */
  alert?: string;
};
export function SettingsScreen({ currentLanguage = 'ro', setLanguage, resetOnboarding, alert }: SettingsScreenProps = {}) {
  const { colors } = useTheme();
  const { canInstall, isIos, isStandalone, install } = useInstallPrompt();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [clearError, setClearError] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const clearPending = useRef(false);
  const installPending = useRef(false);
  const [installing, setInstalling] = useState(false);
  const [languageError, setLanguageError] = useState(false);

  async function confirmClear() {
    if (clearPending.current) return;
    clearPending.current = true; setClearing(true); setClearError(false);
    try {
      await clearHistory();
      setConfirming(false); setMessage(ro.history.cleared);
    } catch { setClearError(true); }
    finally { clearPending.current = false; setClearing(false); }
  }
  async function requestInstall() {
    if (isStandalone) { setInstallMessage(ro.pwa.install.installed); return; }
    if (isIos) { setInstallMessage(ro.pwa.install.iosHint); return; }
    // No beforeinstallprompt (Firefox, desktop Safari, or already used): point to the browser menu.
    if (!canInstall) { setInstallMessage(ro.pwa.install.menuHint); return; }
    if (installPending.current) return;
    installPending.current = true; setInstalling(true); setInstallMessage('');
    try { if (await install() === null) setInstallMessage(ro.pwa.install.failed); }
    catch { setInstallMessage(ro.pwa.install.failed); }
    finally { installPending.current = false; setInstalling(false); }
  }
  const languageNames: Record<Language, string> = { ro: ro.settings.romanian, ru: ro.settings.russian, en: ro.settings.english };
  function chooseLanguage(language: Language) {
    try { setLanguage?.(language); setLanguageError(false); }
    catch { setLanguageError(true); }
  }
  function cancelClear() { if (!clearPending.current) { setConfirming(false); setClearError(false); } }
  return <>
    <Screen>
      <View style={styles.header}><TabPageHeader title={ro.settings.title} onBack={goBack} /></View>
      {alert ? <Body accessibilityRole="alert" style={{ color: colors.low }}>{alert}</Body> : null}
      <Card>
        <Section>{ro.settings.language}</Section>
        <View testID="language-segments" style={[styles.segments, { backgroundColor: colors.surface, opacity: setLanguage ? 1 : 0.55 }, depth.raised]}>
          {languages.map(language => {
            const selected = currentLanguage === language;
            return <HomePressable key={language} label={languageNames[language]} disabled={!setLanguage} aria-pressed={selected} accessibilityState={{ disabled: !setLanguage, selected }} onPress={() => chooseLanguage(language)} style={[styles.segment, selected ? depth.forest : { backgroundColor: colors.transparent }]}><Body style={[styles.segmentLabel, { color: selected ? colors.onPrimary : colors.primary }]}>{languageNames[language]}</Body></HomePressable>;
          })}
        </View>
        {(!setLanguage || languageError) && <Caption accessibilityLiveRegion="polite">{ro.settings.pending}</Caption>}
      </Card>
      <Card style={styles.group}>
        <Section>{ro.settings.app}</Section>
        <View>
          <LinkRow label={ro.settings.install} icon="share" disabled={installing} accessibilityState={{ disabled: installing }} onPress={() => void requestInstall()} />
          {installMessage ? <Body accessibilityLiveRegion="polite">{installMessage}</Body> : null}
          {resetOnboarding ? <LinkRow label={ro.settings.resetOnboarding} icon="history" onPress={resetOnboarding} /> : null}
          <HomePressable label={ro.settings.clearHistory} onPress={() => { setMessage(''); setConfirming(true); }} style={styles.row}>
            <View testID="clear-history-icon" style={[styles.rowIcon, { backgroundColor: colors.lowBg }, depth.raisedSmall]}><Icon name="trash" size={20} color={colors.low} /></View>
            <Body style={[styles.label, { fontFamily: fonts.heading, fontSize: 21, lineHeight: 27, color: colors.low }]}>{ro.settings.clearHistory}</Body>
          </HomePressable>
          {message ? <Body accessibilityLiveRegion="polite">{message}</Body> : null}
        </View>
      </Card>
      <Card style={styles.group}>
        <Section>{ro.settings.info}</Section>
        <View>
          {(['method', 'privacy', 'terms'] as const).map(kind => <LinkRow key={kind} label={ro.settings[kind]} icon={infoIcons[kind]} last={kind === 'terms'} onPress={() => router.push(`/${kind}`)} />)}
        </View>
        <Caption>{ro.settings.version} {Constants.expoConfig?.version ?? ro.app.unavailable}</Caption>
      </Card>
    </Screen>
    <Modal accessibilityLabel={ro.settings.clearHistoryTitle} visible={confirming} transparent animationType="none" onRequestClose={cancelClear}>
      <ScreenSafeArea edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.scrim }}>
        <ScrollView contentContainerStyle={styles.confirmation}>
          <Card accessibilityLabel={ro.settings.clearHistoryTitle} accessibilityViewIsModal>
            <Section>{ro.settings.clearHistoryTitle}</Section><Body>{ro.settings.clearHistoryBody}</Body>
            {clearError ? <Body accessibilityRole="alert">{ro.history.clearError}</Body> : null}
            <Button disabled={clearing} onPress={() => void confirmClear()}>{ro.settings.clearHistoryConfirm}</Button>
            <Button variant="secondary" disabled={clearing} onPress={cancelClear}>{ro.settings.cancel}</Button>
          </Card>
        </ScrollView>
      </ScreenSafeArea>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  header: { marginHorizontal: -16, marginTop: -12 },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: radii.hero },
  segment: { flexGrow: 1, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, justifyContent: 'center' },
  segmentLabel: { textAlign: 'center' },
  group: { gap: 4 },
  row: { minHeight: 64, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: radii.small, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  confirmation: { flexGrow: 1, justifyContent: 'center', padding: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
