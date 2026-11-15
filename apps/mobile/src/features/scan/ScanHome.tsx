import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/useTheme';
import ScanScreen from './ScanScreen';
import { ScanHeader } from './ScanHeader';
import { ScanModeSwitch } from './ScanModeSwitch';
import { RecentScans } from './RecentScans';
import { torchSupported } from './torchSupport';

/** Scan tab: dark camera area with header and mode switch, then the recent-scans sheet. `active` mounts the camera only while the tab is focused. */
export function ScanHome({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const [torch, setTorch] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) { // Leaving the tab turns the flash off, so it is off again on return.
    setWasActive(active);
    if (!active) setTorch(false);
  }
  return <ScrollView style={{ backgroundColor: colors.cameraPanel }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {active ? <StatusBar style="light" /> : null}
    <View style={styles.top}>
      <ScanHeader torch={torch} onTorch={torchSupported ? () => setTorch(on => !on) : undefined} />
      <ScanModeSwitch onLabel={() => router.push('/capture')} />
      {active ? <ScanScreen embedded torch={torch} /> : null}
    </View>
    <RecentScans active={active} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  top: { gap: 16, paddingBottom: 20 },
});
