import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing, typeScale } from '../../theme/tokens';
import { IconCircleButton } from '../../ui/IconCircleButton';
import ScanScreen from './ScanScreen';
import { ScanHeader } from './ScanHeader';
import { ScanModeSwitch } from './ScanModeSwitch';
import { RecentScans } from './RecentScans';
import { torchSupported } from './torchSupport';

/** Scan tab: title, mode switch, camera frame with manual entry and flash, then shelf picks and recent scans. `active` mounts the camera only while the tab is focused. */
export function ScanHome({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const [torch, setTorch] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) { // Leaving the tab turns the flash off, so it is off again on return.
    setWasActive(active);
    if (!active) setTorch(false);
  }
  const flash = torchSupported
    ? <IconCircleButton icon="zap" size={52} label={torch ? ro.scan.flashOff : ro.scan.flashOn} onPress={() => setTorch(on => !on)} />
    : undefined;
  return <ScrollView testID="scan-home" style={{ backgroundColor: colors.ground }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {active ? <StatusBar style="dark" /> : null}
    <ScanHeader />
    <ScanModeSwitch onLabel={() => router.push('/capture')} />
    {active ? <ScanScreen embedded torch={torch} trailing={flash} /> : null}
    <RecentScans active={active} />
    <View>
      <Text style={[styles.note, { color: colors.muted }]}>{ro.score.disclaimer}</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.section, paddingHorizontal: spacing.screenX, paddingTop: spacing.screenTop, paddingBottom: spacing.xxl },
  note: { fontFamily: fonts.body, ...typeScale.caption, textAlign: 'center' },
});
