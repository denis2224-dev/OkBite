import { View } from 'react-native';
import { router } from 'expo-router';
import { AboutScreen } from '../../src/features/about/AboutScreen';
import { ro } from '../../src/copy/ro';
import { letterTones } from '../../src/theme/letterTones';
import { useTheme } from '../../src/theme/useTheme';
import { Button } from '../../src/ui/Button';

export default function AboutPage() {
 const { colors, isDark } = useTheme();
 const tones = isDark ? letterTones.dark : letterTones.light;
 return <View style={{ flex: 1, backgroundColor: colors.ground }}>
  <AboutScreen tierPalette={{ excellent: tones.A.fg, good: tones.B.fg, fair: tones.C.fg, poor: tones.D.fg, bad: tones.E.fg }} />
  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
   <Button variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/privacy')}>{ro.nav.privacy}</Button>
   <Button variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/terms')}>{ro.nav.terms}</Button>
  </View>
 </View>;
}
