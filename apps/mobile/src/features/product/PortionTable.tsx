import { useState } from "react";
import { View, TextInput } from "react-native";
import type { Product } from "@okbite/shared";
import { Card, Heading, Body } from "../../ui";
import { ro } from "../../copy/ro";
import { useTheme } from "../../theme/useTheme";
import { formatAmount } from "../../lib/format";
import { perPortion, percentOfReference, teaspoons } from "./portion";
export function PortionTable({ product }: { product: Product }) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState(String(product.portion.amount));
  const numeric = Number(amount.replace(",", "."));
  const valid =
    amount.trim() !== "" &&
    Number.isFinite(numeric) &&
    numeric > 0 &&
    numeric <= 5000;
  return (
    <Card>
      <Heading style={{ fontSize: 21 }}>{ro.result.portion}</Heading>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Body style={{ flex: 1 }}>{product.portion.label}</Body>
        <TextInput
          accessibilityLabel={ro.result.portion}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          maxLength={6}
          style={{
            minHeight: 48,
            minWidth: 88,
            padding: 12,
            borderWidth: 1,
            borderColor: valid ? colors.border : colors.low,
            color: colors.ink,
            borderRadius: 12,
            fontSize: 16,
          }}
        />
        <Body>{product.unit}</Body>
      </View>
      {(["kcal", "sugar", "sat", "salt"] as const).map((key) => {
        const raw = product.nutrients[key],
          value = raw === null || !valid ? null : perPortion(raw, numeric),
          percentage =
            value === null ? 0 : Math.round(percentOfReference(key, value));
        return (
          <View key={key} style={{ gap: 6, paddingVertical: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Body style={{ flex: 1 }}>{ro.result.nutrients[key]}</Body>
              <Body style={{ fontWeight: "700" }}>
                {value === null
                  ? ro.result.undeclared
                  : `${formatAmount(value)} ${key === "kcal" ? "kcal" : "g"}`}
              </Body>
            </View>
            {value !== null && (
              <>
                <View
                  style={{
                    height: 5,
                    borderRadius: 4,
                    backgroundColor: colors.soft,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      width: `${Math.min(100, percentage)}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
                <Body
                  style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}
                >
                  {ro.result.daily(percentage)}
                </Body>
              </>
            )}
          </View>
        );
      })}
      {product.nutrients.sugar !== null && valid && (
        <Body style={{ fontSize: 13 }}>
          {ro.result.sugarNote(
            teaspoons(perPortion(product.nutrients.sugar, numeric)),
          )}
        </Body>
      )}
      <Body style={{ fontSize: 11, lineHeight: 18, color: colors.muted }}>
        {ro.result.portionNote}
      </Body>
    </Card>
  );
}
