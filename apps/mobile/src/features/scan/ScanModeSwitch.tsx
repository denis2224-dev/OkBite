import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Icon } from '../../ui/Icon';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, radii, shadows } from '../../theme/tokens';
import { ScanIcon } from './ScanIcon';

/** Barcode is this screen; Label opens the existing label-photo flow. Selection changes colour only and is announced. */
export function ScanModeSwitch({ onLabel }: { onLabel: () => void }) {
  const { colors } = useTheme();
  const segment = (selected: boolean, label: string, text: string, icon: (color: string) => ReactNode, onPress?: () => void) => {
    const color = selected ? colors.onPrimary : colors.textSecondary;
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      style={[styles.segment, { backgroundColor: selected ? colors.primary : colors.transparent }]}>
      {icon(color)}
      <Text style={[styles.text, { color }]}>{text}</Text>
    </Pressable>;
  };
  return <View style={[styles.track, { backgroundColor: colors.surface }]}>
    {segment(true, ro.scan.manualLabel, ro.scan.manualLabel, color => <ScanIcon name="barcode" size={20} color={color} />)}
    {segment(false, ro.scan.photoLabel, ro.scan.labelMode, color => <Icon name="camera" size={20} color={color} />, onLabel)}
  </View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 5, gap: 4, borderRadius: radii.segment, boxShadow: shadows.raisedSm },
  segment: { flex: 1, minHeight: 46, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.segmentTab },
  text: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
});
