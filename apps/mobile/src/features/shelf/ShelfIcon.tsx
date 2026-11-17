import Svg, { Path } from 'react-native-svg';

// Our own line drawings on a 24 x 24 grid. `basket` is the generic one for shelves without a drawing yet.
const paths = {
  yogurt: 'M5 8h14M6.5 8l1.2 12h8.6l1.2-12M8 8l1.5-4h5L16 8',
  biscuit: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM9 9h.01M14.5 9.5h.01M10 14.5h.01M15 14h.01M12 12h.01',
  juice: 'M7 9h10l-1.2 11H8.2zM7.6 13h8.8M13 9l2-6h3',
  bread: 'M4 11a3.5 3.5 0 0 1 3.5-4h9A3.5 3.5 0 0 1 20 11c0 1-.6 1.6-1.5 2v6h-13v-6C4.6 12.6 4 12 4 11zM9 11v3M12 11v3M15 11v3',
  apple: 'M12 8c-2-1.5-6-.5-6 4 0 4 2.5 8 4.5 8 .8 0 1-.4 1.5-.4s.7.4 1.5.4c2 0 4.5-4 4.5-8 0-4.5-4-5.5-6-4zM12 8c0-2 1-3.5 3-4',
  milk: 'M8 8l2-4h4l2 4v12H8zM8 8h8M8 13h8',
  cheese: 'M3 12l12-6 6 6v7H3zM3 12h18M8 16h.01M14 15.5h.01M17 17h.01',
  bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 7.5h.01M12 6h.01M16 7.5h.01',
  bottle: 'M10 3h4v4l2 3v11H8V10l2-3zM8 14h8',
  drop: 'M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11z',
  fish: 'M3 12c3-5 9-6 13-2l4-3v10l-4-3c-4 4-10 3-13-2zM8 11h.01',
  cup: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 5h-2M8 4v1.5M12 4v1.5',
  basket: 'M5 9h14l-1.5 11h-11zM9 9l3-5 3 5',
};
export type ShelfIconName = keyof typeof paths;

/** Decorative shelf drawing; the button around it carries the name. */
export function ShelfIcon({ name, color, size = 28 }: { name: ShelfIconName; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <Path d={paths[name]} />
  </Svg>;
}
