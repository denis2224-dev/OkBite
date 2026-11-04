import { useState } from "react";
import { View } from "react-native";
import { previewEntries } from "../../test/fixtures";
import { Card, Heading, Body, Button, Badge } from "../../components";
import { useTheme } from "../../hooks/useTheme";
import { ro } from "../../copy/ro";
import { formatAmount } from "../../utils/format";
export function ComparePreview() {
  const [a, setA] = useState(0),
    [b, setB] = useState(1);
  const { colors } = useTheme();
  const first = previewEntries[a]!,
    second = previewEntries[b]!;
  const same = first.product.category.slug === second.product.category.slug;
  return (
    <>
      <Badge>{ro.app.demo}</Badge>
      <Body style={{ color: colors.muted, fontSize: 12 }}>
        {ro.app.demoNote}
      </Body>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {[first, second].map(({ product, score }, i) => (
          <Card
            key={i}
            style={{ flex: 1, minWidth: 145, alignItems: "center" }}
          >
            <Body style={{ color: colors.muted, fontSize: 12 }}>
              {product.brand}
            </Body>
            <Heading
              style={{ fontSize: 19, lineHeight: 25, textAlign: "center" }}
            >
              {product.name}
            </Heading>
            <Body
              style={{
                fontSize: 28,
                lineHeight: 36,
                fontWeight: "700",
                color:
                  colors[
                    score.grade === "unavailable" ? "neutral" : score.grade
                  ],
              }}
            >
              {score.score ?? "—"}
            </Body>
            <Button
              variant="ghost"
              onPress={() =>
                i === 0
                  ? setA((a + 1) % previewEntries.length)
                  : setB((b + 1) % previewEntries.length)
              }
            >
              {ro.capture.preview.changeProduct}
            </Button>
          </Card>
        ))}
      </View>
      {same ? (
        <Card>
          <Heading style={{ fontSize: 20 }}>
            {ro.result.per100(first.product.unit)}
          </Heading>
          {(
            ["kcal", "fat", "sat", "sugar", "salt", "protein", "fiber"] as const
          ).map((key) => {
            const av = first.product.nutrients[key],
              bv = second.product.nutrients[key],
              higher = key === "protein" || key === "fiber";
            const best =
              av === null || bv === null || av === bv
                ? null
                : (higher ? av > bv : av < bv)
                  ? 0
                  : 1;
            return (
              <View
                key={key}
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Body style={{ flex: 1, fontSize: 13 }}>
                  {ro.result.nutrients[key]}
                </Body>
                {[av, bv].map((value, i) => (
                  <Body
                    key={i}
                    accessibilityLabel={`${i === 0 ? first.product.brand : second.product.brand}: ${value === null ? ro.result.undeclared : formatAmount(value)}${best === i ? ", " + ro.capture.preview.lowerValue : ""}`}
                    style={{
                      width: 76,
                      textAlign: "right",
                      fontWeight: best === i ? "800" : "500",
                      color: best === i ? colors.good : colors.ink,
                    }}
                  >
                    {value === null ? "—" : formatAmount(value)}
                    {best === i ? " ✓" : ""}
                  </Body>
                ))}
              </View>
            );
          })}
          <Body style={{ fontSize: 12, color: colors.muted }}>
            {ro.score.disclaimer}
          </Body>
        </Card>
      ) : (
        <Card>
          <Body>{ro.compare.otherCategory}</Body>
        </Card>
      )}
    </>
  );
}
