import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { Grade } from "../../../data/models/contract";
import { Body } from "../../../shared/widgets/typography";
import { ro } from "../../../core/constants/strings_ro";
export function ScoreRing({
  score,
  grade,
}: {
  score: number | null;
  grade: Grade;
}) {
  if (score === null)
    return (
      <Body accessibilityLabel={ro.result.scoreUnavailable}>
        {ro.result.scoreUnavailable}
      </Body>
    );
  const color =
    grade === "good" ? "#2E6B45" : grade === "medium" ? "#C08A1E" : "#C2532B";
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ro.score.ringLabel(score, grade)}
      style={{
        width: 128,
        height: 128,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={128}
        height={128}
        viewBox="0 0 128 128"
        accessible={false}
        style={{ position: "absolute" }}
      >
        <Circle
          cx={64}
          cy={64}
          r={52}
          fill="none"
          stroke="#ECE7DA"
          strokeWidth={12}
        />
        <Circle
          cx={64}
          cy={64}
          r={52}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray="326.73 326.73"
          strokeDashoffset={326.73 * (1 - score / 100)}
          rotation={-90}
          origin="64,64"
          strokeLinecap="round"
        />
      </Svg>
      <Body style={{ fontSize: 40, lineHeight: 44, fontWeight: "800" }}>
        {score}
      </Body>
      <Body
        style={{
          fontSize: 12,
          lineHeight: 18,
          color: "#56615A",
          fontWeight: "700",
        }}
      >
        {ro.score.outOf}
      </Body>
    </View>
  );
}
