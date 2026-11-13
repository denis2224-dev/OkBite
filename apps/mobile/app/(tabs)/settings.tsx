// N8 owns the complete SettingsScreen. OkBite is light only, so there is no appearance choice here.
import { router } from 'expo-router';
import { Body, Button, Screen } from '../../src/ui';
import { ro } from '../../src/copy/ro';
export default function SettingsTab() {
 return <Screen title={ro.nav.settings} back={false}>
  <Body>{ro.settings.pending}</Body>
  {(['method', 'privacy', 'terms'] as const).map(path => <Button key={path} variant="secondary" onPress={() => router.push(`/${path}`)}>{ro.nav[path]}</Button>)}
 </Screen>;
}
