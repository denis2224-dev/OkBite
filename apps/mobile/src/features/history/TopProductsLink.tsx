import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { Icon } from '../../ui';

/** A plain text button under the History title: "Cele mai bune produse" and a chevron. Always shown. */
export function TopProductsLink() {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.topProducts.title} onPress={() => router.push('/top-products')} style={styles.link}>
    <Text allowFontScaling style={[styles.text, { color: colors.primary }]}>{ro.topProducts.title}</Text>
    <Icon name="arrow" size={18} color={colors.primary} />
  </PressableOpacity>;
}

const styles = StyleSheet.create({
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4 },
  text: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
});
