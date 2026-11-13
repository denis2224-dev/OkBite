import { useMemo } from 'react';
import type { Allergen } from '@okbite/shared';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ro } from '../../copy/ro';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { Icon } from '../../ui/Icon';
import { useProfile } from '../profile';

const copy = ro.compare.design;
// Thumbs-up line icon (Lucide, ISC licence), drawn like the other 24×24 stroke icons.
const THUMBS_UP = 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z';

/**
 * Card lines under the product name: the better-choice verdict and a warning for the user's own allergens.
 * Render it as a direct child of the card: the winner's 2 pt outline is drawn over the card's own border,
 * so both cards keep the same size and layout.
 */
export function CompareVerdict({ better, allergens }: { better: boolean; allergens: readonly string[] }) {
  const theme = useHomeTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useProfile();
  const matches = allergens.filter(name => (profile.allergens as readonly string[]).includes(name));
  if (!better && !matches.length) return null;
  return <>{better && <View style={s.outline} />}<View style={s.lines}>
    {better && <View style={s.line}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={theme.colors.good} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <Path d={THUMBS_UP} />
      </Svg>
      <Text style={[s.text, { color: theme.colors.good }]}>{copy.better}</Text>
    </View>}
    {matches.length > 0 && <View style={s.line}>
      <Icon name="alert" size={16} color={theme.colors.low} />
      <Text style={[s.text, { color: theme.colors.low }]}>{copy.profileWarning(matches.map(name => (ro.allergens[name as Allergen] ?? name).toLocaleLowerCase()).join(', '))}</Text>
    </View>}
  </View></>;
}

const createStyles = (t: HomeTheme) => StyleSheet.create({
  outline: { position: 'absolute', top: -1, right: -1, bottom: -1, left: -1, borderRadius: 20, borderWidth: 2, borderColor: t.colors.ink, pointerEvents: 'none' },
  lines: { marginTop: 8, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  text: { flex: 1, minWidth: 0, fontFamily: t.fonts.bold, fontSize: 13, lineHeight: 18.85 },
});
