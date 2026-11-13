import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { ScanIcon, type ScanIconName } from './ScanIcon';

type Props = { torch: boolean; onTorch?: () => void; manual: boolean; onManual: () => void };

/** okBite wordmark with the flash and manual-entry buttons; `onTorch` is omitted where flash is unsupported. */
export function ScanHeader({ torch, onTorch, manual, onManual }: Props) {
  const { colors } = useTheme();
  const brand = ro.home.design.brand;
  const button = (icon: ScanIconName, label: string, on: boolean, onPress: () => void, state: object) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={state} onPress={onPress}
      style={[styles.round, { backgroundColor: on ? colors.accent : colors.hero }]}>
      <ScanIcon name={icon} color={on ? colors.onAccent : colors.cameraInk} />
    </Pressable>;
  return <View style={styles.row}>
    <Text accessibilityRole="header" accessibilityLabel={brand} style={[styles.brand, { color: colors.cameraInk }]}>
      {brand.slice(0, 2)}<Text style={{ color: colors.accent }}>{brand.slice(2)}</Text>
    </Text>
    <View style={styles.actions}>
      {onTorch ? button('flash', torch ? ro.scan.flashOff : ro.scan.flashOn, torch, onTorch, {}) : null}
      {button('keyboard', ro.scan.manual, manual, onManual, { expanded: manual })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  brand: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, letterSpacing: -0.3 },
  actions: { flexDirection: 'row', gap: 12 },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
