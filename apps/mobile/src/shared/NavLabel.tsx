import { Text, type TextProps } from 'react-native';

/** Bottom-bar label: one whole line that shrinks to fit its column at large font sizes, never truncated. */
export function NavLabel(props: TextProps) {
 return <Text {...props} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} />;
}
