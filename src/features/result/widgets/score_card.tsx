import { View } from "react-native";
import type { ScoreResult } from "../../../data/models/contract";
import {
  Card,
  ScoreRing,
  Body,
  Heading,
  Icon,
  Button,
} from "../../../shared/widgets";
import { useTheme } from "../../../core/theme/app_theme";
import { ro } from "../../../core/constants/strings_ro";
export function ScoreCard({
  score,
  missingMessage,
  pending,
  onCapture,
}: {
  score: ScoreResult;
  missingMessage?: string;
  pending?: boolean;
  onCapture?: () => void;
}) {
  const { colors } = useTheme(),
    d = ro.app.design;
  return (
    <Card>
      {score.score === null ? (
        <>
          <Body
            style={{
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: colors.muted,
            }}
          >
            {ro.score.title}
          </Body>
          <Heading style={{ fontSize: 21 }}>
            {ro.result.scoreUnavailable}
          </Heading>
          <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>
            {pending ? d.pendingTable : missingMessage || ro.result.missing}
          </Body>
          {!pending && onCapture && (
            <Button icon="camera" onPress={onCapture}>
              {d.tablePhoto}
            </Button>
          )}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <ScoreRing score={score.score} grade={score.grade} />
            <View style={{ flex: 1, gap: 6 }}>
              <Body
                style={{
                  fontSize: 11,
                  lineHeight: 16,
                  color: colors.muted,
                  fontWeight: "800",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {ro.score.title}
              </Body>
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 14,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  backgroundColor:
                    score.grade === "good"
                      ? colors.goodBg
                      : score.grade === "medium"
                        ? colors.mediumBg
                        : colors.lowBg,
                }}
              >
                <Body
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color:
                      score.grade === "good"
                        ? colors.good
                        : score.grade === "medium"
                          ? colors.medium
                          : colors.low,
                  }}
                >
                  {ro.score[score.grade]}
                </Body>
              </View>
              <Body
                style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}
              >
                {d.demoScore}
              </Body>
              <Body
                style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}
              >
                {ro.score.disclaimer}
              </Body>
            </View>
          </View>
          <Heading style={{ fontSize: 16, marginTop: 6 }}>{d.why}</Heading>
          {score.reasons.slice(0, 3).map((reason, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "#EEE7D9",
              }}
            >
              <View
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: 14,
                  backgroundColor:
                    reason.tone === "bad"
                      ? colors.lowBg
                      : reason.tone === "good"
                        ? colors.goodBg
                        : colors.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {reason.tone === "good" ? (
                  <Icon name="check" size={14} color={colors.good} />
                ) : (
                  <Body
                    style={{
                      fontWeight: "800",
                      fontSize: 14,
                      lineHeight: 18,
                      color: reason.tone === "bad" ? colors.low : colors.muted,
                    }}
                  >
                    {reason.tone === "bad" ? "−" : "•"}
                  </Body>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontSize: 14, fontWeight: "800" }}>
                  {reason.title}
                </Body>
                <Body
                  style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}
                >
                  {reason.detail}
                </Body>
              </View>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}
