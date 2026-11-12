import { router } from 'expo-router';
import { Platform, View } from 'react-native';
import { getLanguage, setLanguage } from '../../src/copy/lang';
import { ro } from '../../src/copy/ro';
import { useProfile } from '../../src/features/profile';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import { Body } from '../../src/ui';

export default function SettingsTab() {
 const { hydrated, error, resetOnboarding } = useProfile();
 async function restartOnboarding() {
  try {
   await resetOnboarding();
   router.replace('/onboarding');
  } catch {
   // The profile hook retains the error and the saved profile for retry.
  }
 }
 return <View style={{ flex: 1 }}>
  {error && <Body accessibilityRole="alert">{ro.errors.generic}</Body>}
  <SettingsScreen currentLanguage={getLanguage()} setLanguage={Platform.select({ web: setLanguage })}
   resetOnboarding={hydrated ? restartOnboarding : undefined} />
 </View>;
}
