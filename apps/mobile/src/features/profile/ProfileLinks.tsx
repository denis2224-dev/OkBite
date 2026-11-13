import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { Card } from '../../ui/Card';
import { LinkRow } from '../../ui/LinkRow';

/** Settings and About left the tab bar; Profil is where they open from. */
export function ProfileLinks() {
 return <Card style={{ paddingVertical: 4, gap: 0 }}>
  <LinkRow label={ro.nav.settings} icon="sun" onPress={() => router.push('/settings')} />
  <LinkRow label={ro.nav.about} icon="info" last onPress={() => router.push('/about')} />
 </Card>;
}
