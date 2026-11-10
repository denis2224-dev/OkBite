// N8 owns the complete SettingsScreen; preserve existing appearance controls until it lands.
import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Button, Screen } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { useTheme } from '../../src/theme/useTheme';
import { PressableOpacity } from '../../src/shared/PressableOpacity';
export default function SettingsTab() {
 const { colors, preference, setPreference } = useTheme();
 const themes = [
  {value:'system',label:ro.app.system},
  {value:'light',label:ro.home.design.themeLabels.light},
  {value:'dark',label:ro.home.design.themeLabels.dark},
 ] as const;
 return <Screen title={ro.nav.settings} back={false}>
  <View accessibilityRole="radiogroup" accessibilityLabel={ro.settings.theme} style={{gap:8}}>
   <Body>{ro.settings.theme}</Body>
   {themes.map(theme => <PressableOpacity key={theme.value} accessibilityRole="radio" accessibilityLabel={theme.label}
    accessibilityState={{checked:preference === theme.value}} aria-checked={preference === theme.value}
    onPress={() => setPreference(theme.value)} style={{minHeight:48,padding:12,borderRadius:12,borderWidth:2,borderColor:preference === theme.value ? colors.primary : colors.border,backgroundColor:colors.surface}}>
    <Body>{theme.label}</Body>
   </PressableOpacity>)}
  </View>
  <Body>{ro.settings.pending}</Body>
  {(['method', 'privacy', 'terms'] as const).map(path => <Button key={path} variant="secondary" onPress={() => router.push(`/${path}`)}>{ro.nav[path]}</Button>)}
 </Screen>;
}
