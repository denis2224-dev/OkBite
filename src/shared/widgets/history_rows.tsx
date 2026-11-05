import { View, Pressable } from "react-native";
import type { HistoryEntry } from "../../data/models/history_entry";
import { visualFor } from "../../data/mock/mock_products";
import { Card } from "./app_card";
import { Body } from "./typography";
import { Icon } from "./app_icon";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
export function HistoryRows({
  entries,
  onOpen,
  onRemove,
}: {
  entries: readonly (HistoryEntry & { time?: string })[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove?: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ padding: 0, paddingVertical: 4, gap: 0 }}>
      {entries.map((entry, index) => {
        const { product, score } = entry,
          meta = visualFor(product);
        return (
          <View
            key={product.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderTopWidth: index ? 1 : 0,
              borderTopColor: "#EFEADF",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ro.history.open(product.name)}
              onPress={() => onOpen(entry)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 66,
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
                paddingVertical: 10,
                paddingLeft: 12,
                paddingRight: onRemove ? 0 : 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: meta.tint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Body
                  style={{ fontSize: 14, fontWeight: "800", color: meta.lid }}
                >
                  {meta.ini}
                </Body>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Body
                  style={{ fontSize: 14, lineHeight: 19, fontWeight: "700" }}
                >
                  {product.name}
                </Body>
                <Body
                  style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}
                >
                  {product.brand} ·{" "}
                  {entry.time ??
                    new Date(entry.savedAt).toLocaleDateString("ro-RO")}
                </Body>
              </View>
              <View
                style={{
                  backgroundColor:
                    score.grade === "good"
                      ? colors.goodBg
                      : score.grade === "medium"
                        ? colors.mediumBg
                        : score.grade === "low"
                          ? colors.lowBg
                          : colors.neutralBg,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <Body
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "800",
                    color:
                      colors[
                        score.grade === "unavailable" ? "neutral" : score.grade
                      ],
                  }}
                >
                  {score.score ?? ro.app.unavailable}
                </Body>
              </View>
            </Pressable>
            {onRemove && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Șterge ${product.name} din istoric`}
                onPress={() => onRemove(product.id)}
                style={{
                  width: 44,
                  minHeight: 54,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="close" size={17} color={colors.muted} />
              </Pressable>
            )}
          </View>
        );
      })}
    </Card>
  );
}
