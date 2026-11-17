import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Icon } from '../../ui/Icon';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, radii } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { ScanIcon } from './ScanIcon';

/** Soft-depth segmented pill on the dark camera panel (on-dark depth, no white halo): a raised ivory track, Barcode (this screen) as the raised forest segment, Label opens the label-photo flow. Selection is announced, not colour alone. */
export function ScanModeSwitch({ onLabel }: { onLabel: () => void }) {
  const { colors } = useTheme();
  const segment = (selected: boolean, label: string, text: string, icon: (color: string) => ReactNode, onPress?: () => void) => {
    const color = selected ? colors.onPrimary : colors.muted;
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      style={[styles.segment, selected ? depth.forestOnDark : { backgroundColor: colors.transparent }]}>
      {icon(color)}
      <Text style={[styles.text, { color, fontFamily: selected ? fonts.bold : fonts.medium }]}>{text}</Text>
    </Pressable>;
  };
  return <View testID="scan-mode-track" style={[styles.track, { backgroundColor: colors.surface }, depth.raisedOnDark]}>
    {segment(true, ro.scan.manualLabel, ro.scan.manualLabel, color => <ScanIcon name="barcode" size={20} color={color} />)}
    {segment(false, ro.scan.photoLabel, ro.scan.labelMode, color => <Icon name="camera" size={20} color={color} />, onLabel)}
  </View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', marginHorizontal: 16, padding: 4, gap: 4, borderRadius: radii.pill },
  segment: { flex: 1, minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill },
  text: { fontSize: 16, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
});
