import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ro } from '../copy/ro';
import { useSwUpdate } from '../lib/useSwUpdate';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';
import { Card } from './Card';
import { Body } from './Typography';

export function UpdateBanner() {
  const path = usePathname();
  const allowed = !/^\/(capture|scan|identify|add)(\/|$)/.test(path);
  const { pending, apply } = useSwUpdate(allowed);
  const { colors } = useTheme();
  if (!pending || !allowed) return null;
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={{ backgroundColor: colors.ground, padding: 16 }}>
    <Card style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
      <Body accessibilityLiveRegion="polite">{ro.pwa.update.title}</Body>
      <Button onPress={apply}>{ro.pwa.update.apply}</Button>
    </Card>
  </SafeAreaView>;
}
