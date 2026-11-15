import type { ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const paths = {
  flash: 'M13 2L4 14h7l-1 8 9-12h-7z',
  keyboard: 'M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17.5 9.5h.01M6.5 13h.01M10 13h.01M13.5 13h.01M17.5 13h.01M8 16.5h8',
  barcode: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8.5 9v6M12 9v6M15.5 9v6',
};
export type ScanIconName = keyof typeof paths;

/** Line icons for Scan home, drawn like `ui/Icon`. Decorative: the pressable carries the label. */
export function ScanIcon({ name, size = 24, color }: { name: ScanIconName; size?: number; color: ColorValue }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {name === 'keyboard' && <Rect x={2.5} y={5.5} width={19} height={13} rx={3} />}
    <Path d={paths[name]} />
  </Svg>;
}
