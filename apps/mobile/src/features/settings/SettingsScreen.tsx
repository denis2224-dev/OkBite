import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
import { HomePressable } from '../../shared/HomeChrome';
import { Body, Button, Card, Heading, Icon, Screen } from '../../ui';
import { useInstallPrompt } from '../../lib/installPrompt';
import { clearHistory } from '../history/store';

export type SettingsScreenProps = {
  currentLanguage?: 'ro' | 'en';
  setLanguage?: (language: 'ro' | 'en') => void;
  resetOnboarding?: () => void;
};
export function SettingsScreen({ currentLanguage = 'ro', setLanguage, resetOnboarding }: SettingsScreenProps = {}) {
  const { colors, preference, setPreference } = useTheme();
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
    if (isIos) { setInstallMessage(ro.pwa.install.iosHint); return; }
    if (installPending.current) return;
    installPending.current = true; setInstalling(true); setInstallMessage('');
    try { if (await install() === null) setInstallMessage(ro.pwa.install.failed); }
    catch { setInstallMessage(ro.pwa.install.failed); }
    finally { installPending.current = false; setInstalling(false); }
  }
  function chooseLanguage(language: 'ro' | 'en') {
    try { setLanguage?.(language); setLanguageError(false); }
    catch { setLanguageError(true); }
  }
  function cancelClear() { if (!clearPending.current) { setConfirming(false); setClearError(false); } }
  const rowStyle = [styles.row, { borderColor: colors.divider }];
  return <>
    <Screen title={ro.settings.title}>
      <Card>
        <Heading style={[styles.section, styles.sectionLabel, { color: colors.primary }]}>{ro.settings.language}</Heading>
        <View style={styles.choices}>
          {(['ro', 'en'] as const).map(language => <HomePressable key={language} label={ro.settings[language === 'ro' ? 'romanian' : 'english']} disabled={!setLanguage} aria-pressed={currentLanguage === language} accessibilityState={{ disabled: !setLanguage, selected: currentLanguage === language }} onPress={() => chooseLanguage(language)} style={[styles.choice, { backgroundColor: currentLanguage === language ? colors.primary : colors.surface, opacity: setLanguage ? 1 : 0.55 }]}><Body style={{ color: currentLanguage === language ? colors.onPrimary : colors.ink }}>{ro.settings[language === 'ro' ? 'romanian' : 'english']}</Body></HomePressable>)}
        </View>
        {(!setLanguage || languageError) && <Body accessibilityLiveRegion="polite" style={{ color: colors.muted }}>{ro.settings.pending}</Body>}
      </Card>
      <Card>
        <Heading style={[styles.section, styles.sectionLabel, { color: colors.primary }]}>{ro.settings.theme}</Heading>
        <View style={styles.choices}>
          {(['system', 'light', 'dark'] as const).map(value => <HomePressable key={value} label={ro.settings[value]} aria-pressed={preference === value} accessibilityState={{ selected: preference === value }} onPress={() => setPreference(value)} style={[styles.choice, { backgroundColor: preference === value ? colors.primary : colors.surface }]}><Body style={{ color: preference === value ? colors.onPrimary : colors.ink }}>{ro.settings[value]}</Body></HomePressable>)}
        </View>
      </Card>
      <Card>
        <HomePressable label={ro.settings.install} disabled={isStandalone || (!canInstall && !isIos) || installing} accessibilityState={{ disabled: isStandalone || (!canInstall && !isIos) || installing }} onPress={() => void requestInstall()} style={rowStyle}><Body style={styles.label}>{ro.settings.install}</Body><Icon name="arrow" color={colors.muted} /></HomePressable>
        {installMessage ? <Body accessibilityLiveRegion="polite">{installMessage}</Body> : null}
        <HomePressable label={ro.settings.clearHistory} onPress={() => { setMessage(''); setConfirming(true); }} style={rowStyle}><Body style={[styles.label, { color: colors.low }]}>{ro.settings.clearHistory}</Body><Icon name="trash" color={colors.low} /></HomePressable>
        {message ? <Body accessibilityLiveRegion="polite">{message}</Body> : null}
        {resetOnboarding ? <HomePressable label={ro.settings.resetOnboarding} onPress={resetOnboarding} style={rowStyle}><Body style={styles.label}>{ro.settings.resetOnboarding}</Body><Icon name="arrow" color={colors.muted} /></HomePressable> : null}
      </Card>
      <Card>
        {(['method', 'privacy', 'terms'] as const).map(kind => <HomePressable key={kind} label={ro.settings[kind]} onPress={() => router.push(`/${kind}`)} style={rowStyle}><Body style={styles.label}>{ro.settings[kind]}</Body><Icon name="arrow" color={colors.muted} /></HomePressable>)}
      </Card>
      <Body style={{ color: colors.muted, textAlign: 'center' }}>{ro.settings.version} {Constants.expoConfig?.version ?? ro.app.unavailable}</Body>
    </Screen>
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
  sectionLabel: { fontSize: 13, lineHeight: 20, letterSpacing: 0.8, textTransform: 'uppercase' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
  row: { minHeight: 56, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1, minWidth: 0 },
  confirmation: { flexGrow: 1, justifyContent: 'center', padding: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
