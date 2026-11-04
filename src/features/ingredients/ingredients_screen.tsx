import { useState } from "react";
import { View, Pressable } from "react-native";
import { Body, Heading, Card, AllergenChip, Icon } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
import { useTheme } from "../../core/theme/app_theme";
import { useProduct } from "../result/result_controller";
import { formatAmount } from "../../core/utils/formatters";
import { visualFor } from "../../data/mock/mock_products";
import type { Product } from "../../data/models/contract";
export function LabelContent({ product }: { product: Product }) {
  const { colors } = useTheme();
  return (
    <>
      <Body style={{ fontSize: 13, color: colors.muted }}>
        {ro.app.design.photoPrefix}
        {visualFor(product).photo}
        {ro.app.design.photoSuffix}
      </Body>
      <Card style={{ backgroundColor: "#F6F0DD", gap: 10 }}>
        <Heading style={{ fontSize: 18 }}>{product.name}</Heading>
        <Body style={{ fontSize: 13, fontWeight: "700" }}>
          {product.brand} · {product.quantity}
        </Body>
        <Body
          style={{
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {ro.ingredients.title}
        </Body>
        <Body style={{ fontSize: 13, lineHeight: 20 }}>
          {product.ingredientsText}
        </Body>
        <Body
          style={{
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {ro.result.per100(product.unit)}
        </Body>
        {(
          ["kcal", "fat", "sat", "sugar", "salt", "protein", "fiber"] as const
        ).map((key) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              gap: 8,
              paddingVertical: 5,
              borderBottomWidth: 1,
              borderBottomColor: "#D8D1BE",
            }}
          >
            <Body style={{ flex: 1, fontSize: 13 }}>
              {ro.result.nutrients[key]}
            </Body>
            <Body style={{ fontSize: 13 }}>
              {product.nutrients[key] === null
                ? ro.result.undeclared
                : `${formatAmount(product.nutrients[key]!)} ${key === "kcal" ? "kcal" : "g"}`}
            </Body>
          </View>
        ))}
      </Card>
    </>
  );
}
export function DetailsPreview({
  kind,
  id,
}: {
  kind: "ingredients" | "label";
  id: string;
}) {
  const { colors } = useTheme(),
    [open, setOpen] = useState(-1),
    { data, loading, error } = useProduct(id),
    d = ro.app.design;
  if (loading) return <Body>{ro.app.loading}</Body>;
  if (!data) return <Body>{error?.message ?? ro.errors.not_found}</Body>;
  const { product } = data;
  if (kind === "label") return <LabelContent product={product} />;
  const count = product.ingredients.length,
    additives = product.ingredients.filter((i) => i.group === "add").length;
  return (
    <>
      <View style={{ gap: 4 }}>
        <Body style={{ fontSize: 13, color: colors.muted }}>
          {product.name} · {product.brand}
        </Body>
        <Heading style={{ fontSize: 22, lineHeight: 26 }}>
          {count} ingrediente ·{" "}
          {additives ? `${additives} aditivi` : d.withoutAdditives}
        </Heading>
        <Body style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>
          {d.ingredientsHint}
        </Body>
      </View>
      {!!product.allergens.length && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            backgroundColor: colors.warnBg,
            borderWidth: 1,
            borderColor: "#EAD394",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Body style={{ fontSize: 12, fontWeight: "800", color: colors.warn }}>
            {d.allergens}
          </Body>
          {product.allergens.map((name) => (
            <AllergenChip key={name} name={name} />
          ))}
        </View>
      )}
      {(["base", "fat", "taste", "add", "cult"] as const).map((group) => {
        const rows = product.ingredients
          .map((row, index) => ({ ...row, index }))
          .filter((row) => row.group === group);
        return rows.length ? (
          <View key={group} style={{ gap: 8, marginTop: 10 }}>
            <Body
              style={{
                fontSize: 11,
                lineHeight: 16,
                fontWeight: "800",
                letterSpacing: 0.7,
                textTransform: "uppercase",
                color: colors.muted,
              }}
            >
              {ro.ingredients[group]} · {rows.length}
            </Body>
            {rows.map((row) => (
              <Card key={row.index} style={{ padding: 14, gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={row.name}
                  accessibilityState={{ expanded: open === row.index }}
                  onPress={() => setOpen(open === row.index ? -1 : row.index)}
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body style={{ fontSize: 16, fontWeight: "800" }}>
                      {row.name}
                    </Body>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
                    >
                      <View
                        style={{
                          backgroundColor: colors.mint,
                          borderRadius: 14,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <Body
                          style={{
                            fontSize: 11,
                            lineHeight: 16,
                            fontWeight: "800",
                            color: colors.forest,
                          }}
                        >
                          {row.role}
                        </Body>
                      </View>
                      {row.allergen && (
                        <View
                          style={{
                            backgroundColor: colors.warn,
                            borderRadius: 14,
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                          }}
                        >
                          <Body
                            style={{
                              fontSize: 11,
                              lineHeight: 16,
                              fontWeight: "800",
                              color: "#FFFFFF",
                            }}
                          >
                            {d.allergen}
                          </Body>
                        </View>
                      )}
                    </View>
                  </View>
                  <View
                    style={{
                      transform: [
                        { rotate: open === row.index ? "180deg" : "0deg" },
                      ],
                    }}
                  >
                    <Icon name="chevronDown" size={18} color={colors.ink} />
                  </View>
                </Pressable>
                {open === row.index && (
                  <View
                    style={{
                      gap: 6,
                      borderTopWidth: 1,
                      borderTopColor: "#EEE7D9",
                      paddingTop: 8,
                    }}
                  >
                    <Body
                      style={{
                        fontSize: 14,
                        lineHeight: 21,
                        color: colors.muted,
                      }}
                    >
                      {row.explanation ?? ro.ingredients.explanationSoon}
                    </Body>
                    <Body
                      style={{
                        fontSize: 11,
                        lineHeight: 17,
                        color: colors.muted,
                      }}
                    >
                      {ro.ingredients.source}: {row.source}
                    </Body>
                  </View>
                )}
              </Card>
            ))}
          </View>
        ) : null;
      })}
    </>
  );
}
