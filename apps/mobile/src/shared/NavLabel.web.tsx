import { Text, type TextProps } from 'react-native';

/** Browsers cannot shrink text to fit, so a scaled label wraps inside its column instead of being cut off. */
export function NavLabel({ style, ...props }: TextProps) {
 return <Text {...props} style={[style, { overflowWrap: 'anywhere' } as object]} />;
}
