import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type Language } from '../../copy/lang';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
import { HomePressable } from '../../shared/HomeChrome';
import { Body, Button, Card, Heading, LinkRow, Screen } from '../../ui';
import { fonts } from '../../theme/tokens';
import { SettingsGroup } from './SettingsGroup';
import { useInstallPrompt } from '../../lib/installPrompt';
import { clearHistory } from '../history/store';

const languages: readonly Language[] = ['ro', 'ru', 'en'];

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
  const [picking, setPicking] = useState(false);

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
    <Screen title={ro.settings.title}>
      {alert ? <Body accessibilityRole="alert" style={{ color: colors.low }}>{alert}</Body> : null}
      <SettingsGroup label={ro.settings.groupProfile}>
        <LinkRow icon="leaf" singleLine label={ro.allergies.dietaryTitle} onPress={() => router.push('/preferences/dietary')} />
        <LinkRow icon="sprout" singleLine last label={ro.allergies.allergenPrefsTitle} onPress={() => router.push('/preferences/allergens')} />
      </SettingsGroup>
      <SettingsGroup label={ro.settings.groupLanguage}>
        <LinkRow icon="globe" singleLine last label={ro.settings.language} value={languageNames[currentLanguage]} disabled={!setLanguage}
          accessibilityState={{ disabled: !setLanguage }} onPress={() => setPicking(true)} />
      </SettingsGroup>
      {(!setLanguage || languageError) && <Body accessibilityLiveRegion="polite" style={{ color: colors.muted }}>{ro.settings.pending}</Body>}
      <SettingsGroup label={ro.settings.groupApp}>
        <LinkRow icon="download" singleLine label={ro.settings.install} disabled={installing} accessibilityState={{ disabled: installing }}
          onPress={() => void requestInstall()} />
        {resetOnboarding ? <LinkRow icon="history" singleLine label={ro.settings.resetOnboarding} onPress={resetOnboarding} /> : null}
        <LinkRow icon="trash" singleLine last label={ro.settings.clearHistory} onPress={() => { setMessage(''); setConfirming(true); }} />
      </SettingsGroup>
      {installMessage ? <Body accessibilityLiveRegion="polite">{installMessage}</Body> : null}
      {message ? <Body accessibilityLiveRegion="polite">{message}</Body> : null}
      <SettingsGroup label={ro.settings.groupInfo}>
        <LinkRow icon="book" singleLine label={ro.settings.method} onPress={() => router.push('/method')} />
        <LinkRow icon="shield" singleLine label={ro.settings.privacy} onPress={() => router.push('/privacy')} />
        <LinkRow icon="doc" singleLine last label={ro.settings.terms} onPress={() => router.push('/terms')} />
      </SettingsGroup>
      <Body style={{ color: colors.muted }}>{ro.settings.version} {Constants.expoConfig?.version ?? ro.app.unavailable}</Body>
    </Screen>
    <Modal accessibilityLabel={ro.settings.language} visible={picking} transparent animationType="none" onRequestClose={() => setPicking(false)}>
      <ScreenSafeArea edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.scrim }}>
        <ScrollView contentContainerStyle={styles.confirmation}>
          <Card accessibilityLabel={ro.settings.language} accessibilityViewIsModal style={{ paddingVertical: 4, gap: 0 }}>
            {languages.map((language, index) => <HomePressable key={language} label={languageNames[language]} aria-pressed={currentLanguage === language}
              accessibilityState={{ selected: currentLanguage === language }} onPress={() => { chooseLanguage(language); setPicking(false); }}
              style={[styles.row, { borderColor: colors.divider, borderBottomWidth: index === languages.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
              <Body style={[styles.label, currentLanguage === language && { fontFamily: fonts.bold, color: colors.primary }]}>{languageNames[language]}</Body>
            </HomePressable>)}
          </Card>
        </ScrollView>
      </ScreenSafeArea>
    </Modal>
    <Modal accessibilityLabel={ro.settings.clearHistoryTitle} visible={confirming} transparent animationType="none" onRequestClose={cancelClear}>
      <ScreenSafeArea edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.scrim }}>
        <ScrollView contentContainerStyle={styles.confirmation}>
          <Card accessibilityLabel={ro.settings.clearHistoryTitle} accessibilityViewIsModal>
            <Heading style={styles.section}>{ro.settings.clearHistoryTitle}</Heading><Body>{ro.settings.clearHistoryBody}</Body>
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
  section: { fontSize: 19, lineHeight: 27 },
  row: { minHeight: 56, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1, minWidth: 0 },
  confirmation: { flexGrow: 1, justifyContent: 'center', padding: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
