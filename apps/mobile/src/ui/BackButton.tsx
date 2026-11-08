import { View } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../copy/ro';
import { useTheme } from '../theme/useTheme';
import { HomeIcon } from '../shared/HomeChrome';
import { PressableOpacity } from '../shared/PressableOpacity';
export function BackButton() {
 const { colors } = useTheme();
 return <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.app.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minWidth: 44, width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><HomeIcon name="back" size={22} strokeWidth={2.2} color={colors.ink} /></View>
 </PressableOpacity>;
}
