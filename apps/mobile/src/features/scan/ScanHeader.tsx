import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, typeScale } from '../../theme/tokens';

/** okBite wordmark, then the screen title. The flash sits next to manual entry, under the camera. */
export function ScanHeader() {
  const { colors } = useTheme();
  const brand = ro.home.design.brand;
  return <View style={styles.column}>
    <Text accessibilityLabel={brand} style={[styles.brand, { color: colors.ink }]}>
      {brand.slice(0, 2)}<Text style={{ color: colors.primary }}>{brand.slice(2)}</Text>
    </Text>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{ro.scan.homeTitle}</Text>
  </View>;
}

const styles = StyleSheet.create({
  column: { gap: 6 },
  brand: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  title: { fontFamily: fonts.heading, ...typeScale.display, letterSpacing: -0.3 },
});
