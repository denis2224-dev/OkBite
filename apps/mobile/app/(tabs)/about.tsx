import { View } from 'react-native';
import { router } from 'expo-router';
import { AboutScreen } from '../../src/features/about/AboutScreen';
import { ro } from '../../src/copy/ro';
import { letterTones as tones } from '../../src/theme/letterTones';
import { Button } from '../../src/ui/Button';

export default function AboutPage() {
 return <AboutScreen tierPalette={{ excellent: tones.A.fg, good: tones.B.fg, fair: tones.C.fg, poor: tones.D.fg, bad: tones.E.fg }}>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
   <Button variant="ghost" style={{ flexGrow: 1 }} onPress={() => router.push('/privacy')}>{ro.nav.privacy}</Button>
   <Button variant="ghost" style={{ flexGrow: 1 }} onPress={() => router.push('/terms')}>{ro.nav.terms}</Button>
  </View>
 </AboutScreen>;
}
