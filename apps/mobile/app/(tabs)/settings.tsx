import { useState } from 'react';
import { router } from 'expo-router';
import { getLanguage, languageSelectable, setLanguage } from '../../src/copy/lang';
import { ro } from '../../src/copy/ro';
import { useProfile } from '../../src/features/profile';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';

export default function SettingsTab() {
 const { hydrated, resetOnboarding } = useProfile();
 const [resetFailed, setResetFailed] = useState(false);
 async function restartOnboarding() {
  setResetFailed(false);
  try {
   await resetOnboarding();
   router.replace('/onboarding');
  } catch {
   // The profile hook restores the saved profile; Settings stays open for a retry.
   setResetFailed(true);
  }
 }
 return <SettingsScreen currentLanguage={getLanguage()} setLanguage={languageSelectable ? setLanguage : undefined}
  resetOnboarding={hydrated ? restartOnboarding : undefined} alert={resetFailed ? ro.errors.generic : undefined} />;
}
