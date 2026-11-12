import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScanHome } from '../../src/features/scan/ScanHome';
import { ScreenSafeArea } from '../../src/shared/ScreenSafeArea';
import { InstallPrompt } from '../../src/ui/InstallPrompt';
import { useTheme } from '../../src/theme/useTheme';

export default function ScanTab() {
 const { colors } = useTheme();
 const [focused, setFocused] = useState(false);
 useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
 return <ScreenSafeArea edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.cameraPanel }}>
  <InstallPrompt />
  <ScanHome active={focused} />
 </ScreenSafeArea>;
}
