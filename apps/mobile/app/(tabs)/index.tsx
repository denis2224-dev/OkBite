import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import ScanScreen from '../../src/features/scan/ScanScreen';
import { ScreenSafeArea } from '../../src/shared/ScreenSafeArea';
import { Button } from '../../src/ui';
import { InstallPrompt } from '../../src/ui/InstallPrompt';
import { ro } from '../../src/copy/ro';
import { useTheme } from '../../src/theme/useTheme';

export default function ScanTab() {
 const { colors } = useTheme();
 const [focused, setFocused] = useState(false);
 useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
 return <ScreenSafeArea edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.ground }}>
  <InstallPrompt />
  <View style={{ flex: 1 }}>{focused && <ScanScreen />}</View>
  <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}><Button variant="secondary" onPress={() => router.push('/capture')}>{ro.scan.photoLabel}</Button></View>
 </ScreenSafeArea>;
}
