import { View } from 'react-native';
import type { Ingredient } from '@okbite/shared';
import { Body } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const plain = (text: string) => text.replace(/\([^)]*\)/g, '').trim().toLocaleLowerCase('ro');
/** The role adds nothing when the ingredient's name already says it, e.g. "acid citric (E330)" and "Acid citric (E330)". */
export const roleAddsInfo = (name: string, role: string | null | undefined): role is string =>
  Boolean(role && plain(role) && !plain(name).includes(plain(role)));
/** First sentence only; the ingredients page keeps the full explanation and its source. */
export const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

export function ExplainedIngredient({ item }: { item: Pick<Ingredient, 'name' | 'role' | 'explanation'> }) {
  const { colors } = useTheme();
  return <View style={{ gap: 2 }}>
    <Body style={{ fontFamily: fonts.bold }}>{item.name}</Body>
    {roleAddsInfo(item.name, item.role) && <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{item.role}</Body>}
    {item.explanation && <Body>{firstSentence(item.explanation)}</Body>}
  </View>;
}
