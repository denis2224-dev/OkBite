import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Card } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

type Props = { id: string; title: string; items: readonly string[]; href: '/preferences/dietary' | '/preferences/allergens' };

/** The choices a person made, shown on Profile: title on the left, a plain "Edit" link on the far right, then the chosen items as chips. */
export function PreferenceCard({ id, title, items, href }: Props) {
  const { colors } = useTheme();
  return <Card testID={id} style={{ gap: 12, borderRadius: 20 }}>
    <View testID={`${id}-header`} style={styles.header}>
      <Body accessibilityRole="header" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: fonts.bold }}>{title}</Body>
      <PressableOpacity accessibilityRole="button" accessibilityLabel={`${ro.profile.edit}: ${title}`} hitSlop={8} onPress={() => router.push(href)} style={styles.edit}>
        <Text allowFontScaling style={{ fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.good }}>{ro.profile.edit}</Text>
      </PressableOpacity>
    </View>
    {items.length ? <View testID={`${id}-chips`} style={styles.chips}>
      {items.map(item => <View key={item} style={[styles.chip, { backgroundColor: colors.mint }]}>
        <Body style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.primary }}>{item}</Body>
      </View>)}
    </View> : null}
  </Card>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  edit: { minHeight: 44, justifyContent: 'center', flexShrink: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
