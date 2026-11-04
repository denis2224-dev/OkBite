import { View } from "react-native";
import type { Product } from "../../../data/models/contract";
import { Card, Heading, Body, Icon } from "../../../shared/widgets";
import { ro } from "../../../core/constants/strings_ro";
import { useTheme } from "../../../core/theme/app_theme";
import { formatAmount } from "../../../core/utils/formatters";
import {
  perPortion,
  percentOfReference,
  teaspoons,
} from "../../../core/utils/portion";
import { visualFor } from "../../../data/mock/mock_products";
export function PortionTable({ product }: { product: Product }) {
  const { colors } = useTheme(),
    sugar =
      product.nutrients.sugar === null
        ? null
        : perPortion(product.nutrients.sugar, product.portion.amount);
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Heading style={{ fontSize: 18 }}>{ro.result.portion}</Heading>
        <Body
          style={{
            fontSize: 12,
            color: colors.muted,
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {product.portion.label}
        </Body>
      </View>
      {(["kcal", "sugar", "sat", "salt"] as const).map((key) => {
        const raw = product.nutrients[key],
          value = raw === null ? null : perPortion(raw, product.portion.amount),
          percent =
            value === null ? 0 : Math.round(percentOfReference(key, value));
        return (
          <View key={key} style={{ gap: 5, paddingTop: 5, paddingBottom: 6 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <Body style={{ fontWeight: "700" }}>
                {key === "sat" ? "Grăsimi saturate" : ro.result.nutrients[key]}
              </Body>
              <Body
                style={{
                  fontWeight: "800",
                  color: value === null ? colors.low : colors.ink,
                }}
              >
                {value === null
                  ? ro.result.undeclared
                  : `${key === "kcal" ? Math.round(value) : formatAmount(value)} ${key === "kcal" ? "kcal" : "g"}`}
              </Body>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.soft,
                overflow: "hidden",
              }}
            >
              {value !== null && (
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    width: `${Math.min(percent, 100)}%`,
                    backgroundColor: "#2E6B45",
                  }}
                />
              )}
            </View>
            <Body style={{ fontSize: 11, lineHeight: 16, color: colors.muted }}>
              {value === null
                ? ro.app.design.missingOnLabel
                : ro.result.daily(percent)}
            </Body>
          </View>
        );
      })}
      {sugar !== null && (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.soft,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Icon name="info" size={18} color={colors.forest} />
          <Body style={{ fontSize: 13, lineHeight: 19, flex: 1 }}>
            Aproximativ{" "}
            <Body style={{ fontWeight: "800" }}>{teaspoons(sugar)}</Body> de
            zahăr în porție
            {visualFor(product).sugarNote
              ? ` · ${visualFor(product).sugarNote}`
              : ""}
            .
          </Body>
        </View>
      )}
      <Body style={{ fontSize: 11, lineHeight: 16, color: colors.muted }}>
        {ro.result.portionNote}
      </Body>
    </Card>
  );
}
