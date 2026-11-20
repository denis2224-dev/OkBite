import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScanHome } from '../../src/features/scan/ScanHome';
import { InstallPrompt } from '../../src/ui/InstallPrompt';
import { useTheme } from '../../src/theme/useTheme';

/** The camera runs edge to edge here, behind the status bar and the floating tab bar. */
export default function ScanTab() {
 const { colors } = useTheme();
 const [focused, setFocused] = useState(false);
 useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
 return <View style={{ flex: 1, backgroundColor: colors.cameraBackground }}>
  <ScanHome active={focused} />
  <InstallPrompt />
 </View>;
}
