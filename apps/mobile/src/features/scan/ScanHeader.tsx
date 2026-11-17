import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { IconButton } from '../../ui/IconButton';
import { ScanIcon } from './ScanIcon';

type Props = { torch: boolean; onTorch?: () => void };

/** okBite wordmark with the flash button; `onTorch` is omitted where flash is unsupported. Manual entry lives under the scanner.
 * The bolt is filled while the torch is on; the label also says which way the press goes. */
export function ScanHeader({ torch, onTorch }: Props) {
  const { colors } = useTheme();
  const brand = ro.home.design.brand;
  return <View style={styles.row}>
    <Text accessibilityRole="header" accessibilityLabel={brand} style={[styles.brand, { color: colors.cameraInk }]}>
      {brand.slice(0, 2)}<Text style={{ color: colors.sage }}>{brand.slice(2)}</Text>
    </Text>
    {onTorch ? <IconButton onDark label={torch ? ro.scan.flashOff : ro.scan.flashOn} onPress={onTorch}>
      <ScanIcon name="flash" size={22} color={colors.primary} fill={torch ? colors.primary : colors.transparent} />
    </IconButton> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  brand: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, letterSpacing: -0.3 },
});
