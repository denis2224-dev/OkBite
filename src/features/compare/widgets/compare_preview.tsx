import { useState } from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { previewEntries, visualFor } from "../../../data/mock/mock_products";
import { useDemoState } from "../../../shared/state/app_state";
import {
  Card,
  Heading,
  Body,
  Button,
  Icon,
  AllergenChip,
} from "../../../shared/widgets";
import { useTheme } from "../../../core/theme/app_theme";
import { ro } from "../../../core/constants/strings_ro";
import { formatAmount } from "../../../core/utils/formatters";
import { teaspoons } from "../../../core/utils/portion";
import { useToast } from "../../../shared/widgets/toast";
export function ComparePreview({
  initialA,
  initialB,
}: {
  initialA?: string;
  initialB?: string;
}) {
  const demo = useDemoState(),
    entries = Object.values(demo.products),
    { colors } = useTheme(),
    toast = useToast(),
    d = ro.app.design;
  const [a, setA] = useState(initialA ?? previewEntries[0]!.product.id),
    [b, setB] = useState(initialB ?? previewEntries[1]!.product.id),
    [picker, setPicker] = useState<"a" | "b" | null>(null);
  const first = demo.products[a] ?? previewEntries[0]!,
    second = demo.products[b] ?? previewEntries[1]!,
    same = first.product.category.slug === second.product.category.slug;
  const peers = entries.filter(
    (e) =>
      e.product.category.slug === first.product.category.slug &&
      e.product.id !== a,
  );
  function changeB() {
    if (!peers.length) {
      toast(d.noPeer);
      return;
    }
    const index = peers.findIndex((e) => e.product.id === b);
    setB(peers[(index + 1) % peers.length]!.product.id);
  }
  function category() {
    const categories = [
        ...new Set(entries.map((e) => e.product.category.slug)),
      ],
      next =
        categories[
          (categories.indexOf(first.product.category.slug) + 1) %
            categories.length
        ],
      group = entries.filter((e) => e.product.category.slug === next);
    setA(group[0]!.product.id);
    setB((group[1] ?? group[0])!.product.id);
    if (group.length < 2) toast(d.noPeer);
  }
  function pick(id: string) {
    if (picker === "a") {
      setA(id);
      const peer = entries.find(
        (e) =>
          e.product.id !== id &&
          e.product.category.slug === demo.products[id]!.product.category.slug,
      );
      setB(peer?.product.id ?? id);
    } else setB(id);
    setPicker(null);
  }
  const sugarA = first.product.nutrients.sugar,
    sugarB = second.product.nutrients.sugar;
  const lower =
    sugarA !== null && sugarB !== null && sugarA !== sugarB
      ? sugarA < sugarB
        ? first.product
        : second.product
      : null;
  const ds =
      sugarA === null || sugarB === null ? null : Math.abs(sugarA - sugarB),
    more = lower?.id === first.product.id ? second.product : first.product;
  let summary =
    ds === null
      ? ro.result.missing
      : ds < 0.5
        ? "Cantitatea de zahăr este aproape aceeași."
        : `${lower!.brand} are cu ${formatAmount(ds)} g mai puțin zahăr la 100 ${first.product.unit}. La o porție de ${more.portion.amount} ${more.unit}, diferența este ≈ ${teaspoons((ds * more.portion.amount) / 100)}.`;
  const satA = first.product.nutrients.sat,
    satB = second.product.nutrients.sat;
  if (satA !== null && satB !== null && Math.abs(satA - satB) >= 1)
    summary += ` ${satA < satB ? first.product.brand : second.product.brand} are și cu ${formatAmount(Math.abs(satA - satB))} g mai puține grăsimi saturate.`;
  return (
    <>
      <Body
        style={{
          fontSize: 12,
          lineHeight: 17,
          color: colors.muted,
          marginTop: -6,
        }}
      >
        {first.product.category.name} · valori la 100 {first.product.unit}
      </Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[first, second].map(({ product, score }, i) => {
          const v = visualFor(product);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${i === 0 ? d.productA : d.productB}: ${product.name}`}
              onPress={() => setPicker(i === 0 ? "a" : "b")}
              style={{ flex: 1 }}
            >
              <Card style={{ flex: 1, padding: 14, gap: 7 }}>
                <Body
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                    color: colors.muted,
                    textTransform: "uppercase",
                  }}
                >
                  {i === 0 ? d.productA : d.productB}
                </Body>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: v.tint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Body
                    style={{ fontSize: 17, fontWeight: "800", color: v.lid }}
                  >
                    {v.ini}
                  </Body>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Body
                    style={{ fontSize: 14, fontWeight: "800", lineHeight: 18 }}
                  >
                    {product.name}
                  </Body>
                  <Body
                    style={{
                      fontSize: 12,
                      lineHeight: 17,
                      color: colors.muted,
                    }}
                  >
                    {product.brand}
                  </Body>
                </View>
                <View
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor:
                      score.grade === "good"
                        ? colors.goodBg
                        : score.grade === "medium"
                          ? colors.mediumBg
                          : score.grade === "low"
                            ? colors.lowBg
                            : colors.soft,
                  }}
                >
                  <Body
                    style={{
                      fontSize: 12,
                      lineHeight: 17,
                      fontWeight: "800",
                      color:
                        score.grade === "good"
                          ? colors.good
                          : score.grade === "medium"
                            ? colors.medium
                            : score.grade === "low"
                              ? colors.low
                              : colors.muted,
                    }}
                  >
                    {score.score === null
                      ? ro.app.unavailable
                      : `${score.score} · ${ro.score[score.grade]}`}
                  </Body>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          variant="soft"
          icon="swap"
          style={{ flex: 1 }}
          onPress={changeB}
        >
          {d.changeB}
        </Button>
        <Button variant="soft" style={{ flex: 1 }} onPress={category}>
          {d.otherCategory}
        </Button>
      </View>
      {same && a !== b ? (
        <>
          <Card style={{ gap: 0, padding: 14 }}>
            <View
              style={{
                flexDirection: "row",
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#E8E1D3",
              }}
            >
              <Body
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                  color: colors.muted,
                }}
              >
                LA 100 {first.product.unit.toUpperCase()}
              </Body>
              {["A", "B"].map((letter) => (
                <Body
                  key={letter}
                  style={{
                    width: 84,
                    fontSize: 11,
                    textAlign: "center",
                    fontWeight: "800",
                    color: colors.muted,
                  }}
                >
                  {letter}
                </Body>
              ))}
            </View>
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
            ).map((key) => {
              const av = first.product.nutrients[key],
                bv = second.product.nutrients[key],
                higher = key === "protein" || key === "fiber",
                difference =
                  av === null || bv === null ? null : Math.abs(av - bv),
                best =
                  key === "kcal" || difference === null || difference <= 0.05
                    ? null
                    : (higher ? av! > bv! : av! < bv!)
                      ? 0
                      : 1;
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#EEE7D9",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        lineHeight: 19,
                      }}
                    >
                      {ro.result.nutrients[key]}
                    </Body>
                    <Body
                      style={{
                        fontSize: 11,
                        lineHeight: 15,
                        color: colors.muted,
                      }}
                    >
                      {difference === null
                        ? ro.result.undeclared
                        : difference <= 0.05
                          ? d.same
                          : `diferență ${key === "kcal" ? Math.round(difference) : formatAmount(difference)} ${key === "kcal" ? "kcal" : "g"}`}
                    </Body>
                  </View>
                  {[av, bv].map((value, i) => (
                    <View
                      key={i}
                      style={{
                        width: 78,
                        paddingVertical: 6,
                        paddingHorizontal: 2,
                        borderRadius: 10,
                        backgroundColor: best === i ? "#D5E8CE" : "transparent",
                      }}
                    >
                      <Body
                        accessibilityLabel={`${i === 0 ? first.product.brand : second.product.brand}: ${value === null ? ro.result.undeclared : formatAmount(value)}${best === i ? ", " + d.better : ""}`}
                        style={{
                          fontSize: 14,
                          fontWeight: best === i ? "800" : "600",
                          textAlign: "center",
                          color: best === i ? colors.forest : colors.ink,
                        }}
                      >
                        {value === null
                          ? "—"
                          : `${key === "kcal" ? Math.round(value) : formatAmount(value)} ${key === "kcal" ? "kcal" : "g"}`}
                      </Body>
                    </View>
                  ))}
                </View>
              );
            })}
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "#D5E8CE",
                }}
              />
              <Body
                style={{
                  flex: 1,
                  fontSize: 11,
                  lineHeight: 16,
                  color: colors.muted,
                }}
              >
                {d.better}
              </Body>
            </View>
          </Card>
          <Card
            style={{ backgroundColor: colors.mint, borderColor: "#D0DDC9" }}
          >
            <Heading style={{ fontSize: 18 }}>{d.summary}</Heading>
            <Body style={{ fontSize: 14, lineHeight: 21 }}>{summary}</Body>
          </Card>
        </>
      ) : (
        <Card>
          <Body>{a === b ? d.noPeer : ro.compare.otherCategory}</Body>
        </Card>
      )}
      <Card>
        <Heading style={{ fontSize: 18 }}>{ro.result.allergens}</Heading>
        {[first, second].map(({ product }, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Body style={{ fontWeight: "800", fontSize: 12 }}>
              {i === 0 ? "A" : "B"}:
            </Body>
            {product.allergens.length ? (
              product.allergens.map((name) => (
                <AllergenChip key={name} name={name} />
              ))
            ) : (
              <Body style={{ fontSize: 12, color: colors.muted }}>
                {d.noneDetected}
              </Body>
            )}
          </View>
        ))}
      </Card>
      <Body style={{ fontSize: 11, lineHeight: 16, color: colors.muted }}>
        {d.compareNote}
      </Body>
      <Modal
        visible={picker !== null}
        transparent
        animationType="none"
        onRequestClose={() => setPicker(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.scrim,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ro.app.close}
            onPress={() => setPicker(null)}
            style={{ flex: 1, minHeight: 44 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.ground,
              padding: 18,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
              width: "100%",
              maxWidth: 390,
              alignSelf: "center",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Heading style={{ fontSize: 21, flex: 1 }}>
                {picker === "a" ? d.productA : d.productB}
              </Heading>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ro.app.close}
                onPress={() => setPicker(null)}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="close" color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {(picker === "b" ? peers : entries).map(({ product }) => (
                <Button
                  key={product.id}
                  variant="secondary"
                  onPress={() => pick(product.id)}
                >{`${product.name} · ${product.brand}`}</Button>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
