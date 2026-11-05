import { Platform, type ColorValue } from "react-native";
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={Platform.OS === "web" ? undefined : false}
      aria-hidden
    >
      <Path d={paths[name]} />
      {name === "settings" && (
        <>
          <Circle cx={16} cy={7} r={2} />
          <Circle cx={10} cy={17} r={2} />
        </>
      )}

      {name === "camera" && <Circle cx={12} cy={13} r={3.5} />}
      {name === "tag" && <Circle cx={16} cy={8} r={1.6} />}
      {name === "info" && <Circle cx={12} cy={12} r={9} />}
      {name === "sun" && <Circle cx={12} cy={12} r={4} />}
      {name === "history" && <Circle cx={12} cy={12} r={8} />}
      {name === "barcodeSearch" && <Circle cx={16.5} cy={15.5} r={3.5} />}
      {name === "gallery" && <Rect x={4} y={5} width={16} height={14} rx={2} />}
    </Svg>
  );
}
