import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { SoftCard } from '../../ui/SoftCard';
import { SettingsRow } from '../../ui/SettingsRow';

/** Alergii, Setări and Despre as settings rows; Setări and Despre left the tab bar and open from here. */
export function ProfileLinks() {
  return <SoftCard style={{ paddingVertical: 4, gap: 0 }}>
    <SettingsRow first icon="shield" title={ro.profile.myAllergies} onPress={() => router.navigate('/allergies')} />
    <SettingsRow icon="sun" title={ro.nav.settings} onPress={() => router.push('/settings')} />
    <SettingsRow icon="info" title={ro.nav.about} onPress={() => router.push('/about')} />
  </SoftCard>;
}
