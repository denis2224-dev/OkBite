import type { ColorValue } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import paths from "../../../assets/icons/paths.json";
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 22,
  color = "currentColor",
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      aria-hidden
    >
      <Path d={paths[name]} />
      {name === "camera" && <Circle cx={12} cy={13} r={3.5} />}
      {name === "tag" && <Circle cx={16} cy={8} r={1.5} />}
      {name === "info" && <Circle cx={12} cy={12} r={9} />}
      {name === "sun" && <Circle cx={12} cy={12} r={4} />}
      {name === "scan" && (
        <Rect x={8} y={9} width={8} height={6} strokeWidth={0} />
      )}
    </Svg>
  );
}
