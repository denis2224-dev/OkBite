import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { Grade } from "../../../data/models/contract";
import { useTheme } from "../../../core/theme/app_theme";
import { Body } from "../../../shared/widgets/typography";
import { fonts } from "../../../core/theme/typography";
import { ro } from "../../../core/constants/strings_ro";
export function ScoreRing({
  score,
  grade,
}: {
  score: number | null;
  grade: Grade;
}) {
  const { colors } = useTheme();
  const color = grade === "unavailable" ? colors.muted : colors[grade];
  const c = 2 * Math.PI * 48;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        score === null
          ? ro.result.scoreUnavailable
          : ro.score.ringLabel(score, grade)
      }
      style={{
        width: 120,
        height: 120,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={120}
        height={120}
        viewBox="0 0 120 120"
        style={{ position: "absolute" }}
        accessible={false}
      >
        <Circle
          cx={60}
          cy={60}
          r={48}
          fill="none"
          stroke={colors.border}
          strokeWidth={8}
        />
        {score !== null && (
          <Circle
            cx={60}
            cy={60}
            r={48}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={`${c * (score / 100)} ${c}`}
            rotation={-90}
            origin="60,60"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Body
        style={{
          fontFamily: fonts.heading,
          fontSize: 37,
          lineHeight: 42,
          color,
        }}
      >
        {score ?? "—"}
      </Body>
      <Body style={{ fontSize: 11, lineHeight: 16, color: colors.muted }}>
        {score === null ? ro.app.unavailable : ro.score.outOf}
      </Body>
    </View>
  );
}
