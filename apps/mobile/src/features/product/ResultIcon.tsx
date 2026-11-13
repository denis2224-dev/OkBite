import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const paths = { minus: 'M8 12h8', plus: 'M8 12h8M12 8v8', chevronDown: 'M6 9l6 6 6-6', flag: 'M5 21V4M5 4h12l-2.5 4.5L17 13H5' };
export type ResultIconName = keyof typeof paths;

/** Line icons used only on the result screen, drawn like `ui/Icon`. */
export function ResultIcon({ name, size = 20, color }: { name: ResultIconName; size?: number; color: ColorValue }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {(name === 'minus' || name === 'plus') && <Circle cx={12} cy={12} r={9} />}
    <Path d={paths[name]} />
  </Svg>;
}
