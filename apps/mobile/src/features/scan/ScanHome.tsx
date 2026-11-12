import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/useTheme';
import ScanScreen from './ScanScreen';
import { ScanHeader } from './ScanHeader';
import { ScanModeSwitch } from './ScanModeSwitch';
import { torchSupported } from './torchSupport';

/** Scan tab: dark camera area with header and mode switch. `active` mounts the camera only while the tab is focused. */
export function ScanHome({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) { // Leaving the tab turns the flash off, so it is off again on return.
    setWasActive(active);
    if (!active) setTorch(false);
  }
  return <ScrollView style={{ backgroundColor: colors.cameraPanel }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {active ? <StatusBar style="light" /> : null}
    <View style={styles.top}>
      <ScanHeader torch={torch} onTorch={torchSupported ? () => setTorch(on => !on) : undefined} manual={manual} onManual={() => setManual(open => !open)} />
      <ScanModeSwitch onLabel={() => router.push('/capture')} />
      {active ? <ScanScreen embedded torch={torch} manual={manual} /> : null}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  top: { gap: 16, paddingBottom: 20 },
});
