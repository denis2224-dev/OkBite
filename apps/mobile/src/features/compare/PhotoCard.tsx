import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { compareCaptureRoute } from '../identify/routes';

/** The big "Fotografiază un produs" button: text only, in the dark green of the active tab. Whatever it photographs lands in slot A or B. */
export function PhotoCard() {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.compare.photoCard} onPress={() => router.push(compareCaptureRoute)}
    style={[styles.card, { backgroundColor: colors.primary }]}>
    <Text allowFontScaling style={[styles.text, { color: colors.onPrimary }]}>{ro.compare.photoCard}</Text>
  </PressableOpacity>;
}

const styles = StyleSheet.create({
  card: { minHeight: 60, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 23, textAlign: 'center' },
});
