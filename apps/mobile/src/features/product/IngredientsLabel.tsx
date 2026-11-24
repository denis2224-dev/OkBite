import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Body, Card } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts, typeScale } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { ResultIcon } from './ResultIcon';

/** "Ingredients": the label text as printed (no "Ingrediente:" in front, the heading says it), in a pale box; a down chevron opens and closes it (open at first). */
export function IngredientsLabel({ product }: { product: Product }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(true);
  const text = product.ingredientsText.trim();
  if (!text) return null;
  return <Card testID="ingredients-label" style={{ paddingVertical: 4, gap: 0, borderRadius: 22 }}>
    <PressableOpacity accessibilityRole="button" accessibilityLabel={open ? ro.result.ingredientsHide : ro.result.ingredientsShow}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Body style={{ fontFamily: fonts.bold, color: colors.primary }}>{ro.result.ingredientsTitle}</Body>
      <View testID="ingredients-chevron" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
        <ResultIcon name="chevronDown" size={22} color={colors.primary} />
      </View>
    </PressableOpacity>
    {open && <View testID="ingredients-text" style={{ marginBottom: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.ground }}>
      <Text selectable allowFontScaling style={{ fontFamily: fonts.body, ...typeScale.body, color: colors.ink }}>{text}</Text>
    </View>}
  </Card>;
}
