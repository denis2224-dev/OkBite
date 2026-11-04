import { useState } from "react";
import { View, Pressable } from "react-native";
import { Body, Heading, Card, Badge, Icon } from "../../components";
import { ro } from "../../copy/ro";
import { useTheme } from "../../hooks/useTheme";
import { useProduct } from "../../hooks/useProduct";
import { formatAmount } from "../../utils/format";
export function DetailsPreview({
  kind,
  id,
}: {
  kind: "ingredients" | "label";
  id: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(-1);
  const { data, loading, error } = useProduct(id);
  if (loading) return <Body>{ro.app.loading}</Body>;
  if (!data) return <Body>{error?.message ?? ro.errors.not_found}</Body>;
  const { product } = data;
  return (
    <>
      <Badge>{ro.app.demo}</Badge>
      <Heading>
        {kind === "ingredients" ? ro.ingredients.title : ro.result.original}
      </Heading>
      <Body style={{ color: colors.muted }}>{product.name}</Body>
      {kind === "ingredients" ? (
        (["base", "fat", "taste", "add", "cult"] as const).map((group) => {
          const rows = product.ingredients
            .map((row, index) => ({ ...row, index }))
            .filter((row) => row.group === group);
          return rows.length ? (
            <View key={group} style={{ gap: 10 }}>
              <Heading style={{ fontSize: 18 }}>
                {ro.ingredients[group]}
              </Heading>
              <Card>
                {rows.map((row) => (
                  <View key={row.index}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={row.name}
                      accessibilityState={{ expanded: open === row.index }}
                      onPress={() =>
                        setOpen(open === row.index ? -1 : row.index)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 52,
                      }}
                    >
                      <Body style={{ flex: 1, fontWeight: "700" }}>
                        {row.name}
                      </Body>
                      <Icon
                        name={open === row.index ? "close" : "arrow"}
                        size={16}
                        color={colors.muted}
                      />
                    </Pressable>
                    {open === row.index && (
                      <View style={{ gap: 6, paddingBottom: 12 }}>
                        <Body style={{ fontSize: 12, color: colors.muted }}>
                          {row.role}
                        </Body>
                        <Body>{ro.ingredients.explanationSoon}</Body>
                      </View>
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ) : null;
        })
      ) : (
        <>
          <Card>
            <Icon name="book" size={40} color={colors.primary} />
            <Body>{ro.result.labelPreview}</Body>
            <Body>{product.ingredientsText}</Body>
          </Card>
          <Card>
            <Heading style={{ fontSize: 20 }}>
              {ro.result.per100(product.unit)}
            </Heading>
            {(
              [
                "kcal",
                "fat",
                "sat",
                "sugar",
                "salt",
                "protein",
                "fiber",
              ] as const
            ).map((key) => (
              <View
                key={key}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Body style={{ flex: 1 }}>{ro.result.nutrients[key]}</Body>
                <Body>
                  {product.nutrients[key] === null
                    ? ro.result.undeclared
                    : formatAmount(product.nutrients[key]!)}{" "}
                  {key === "kcal" ? "kcal" : "g"}
                </Body>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
