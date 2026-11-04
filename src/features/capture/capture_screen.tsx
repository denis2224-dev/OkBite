import { mockOcr } from "../../data/mock/mock_ocr";
import { routes } from "../../core/router/routes";
import { ScannerScreen } from "../scanner/scanner_screen";
import { ConfirmProductScreen } from "../scanner/confirm_product_screen";
import { barcodeError } from "../../core/utils/barcode_validator";
import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Badge,
  Icon,
} from "../../shared/widgets";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
import { previewEntries } from "../../data/mock/mock_products";
import {
  start,
  next,
  validateReview,
  type Step,
  type Review,
} from "./capture_controller";
import { Pack } from "../../shared/widgets/product_pack";
import { saveToHistory } from "../../data/repositories/history_repository";
export function WorkflowPreview({ initial = "capture" }: { initial?: Step }) {
  const { colors } = useTheme();
  const [flow, setFlow] = useState({ ...start(), step: initial }),
    [denied, setDenied] = useState(false),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [review, setReview] = useState<Review>({ ...mockOcr }),
    [saving, setSaving] = useState(false);
  const move = (event: Parameters<typeof next>[1]) => {
    setError("");
    setFlow(next(flow, event));
  };
  const entry = previewEntries[0]!;
  function findCode() {
    if (barcodeError(code)) {
      setError(ro.scan.manualInvalid);
      return;
    }
    const found = previewEntries.find((e) => e.product.code === code);
    if (found) router.push(`/product/${found.product.id}`);
    else move("unknown");
  }
  async function save() {
    if (!validateReview(review)) {
      setError(ro.review.unclearField);
      return;
    }
    setSaving(true);
    const parse = (key: "kcal" | "fat" | "sugar" | "sat" | "salt") =>
      Number(review[key].replace(",", "."));
    try {
      const product = {
        ...entry.product,
        id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e7f",
        code: null,
        name: ro.capture.preview.newProduct,
        brand: ro.capture.preview.newBrand,
        status: "unverified" as const,
        verifiedAt: null,
        quantity: "200 g",
        category: {
          slug: "napolitane",
          name: ro.capture.preview.waferCategory,
          scoreKind: "general" as const,
        },
        portion: { amount: 30, label: ro.capture.preview.newPortion },
        nutrients: {
          kcal: parse("kcal"),
          fat: parse("fat"),
          sat: parse("sat"),
          sugar: parse("sugar"),
          salt: parse("salt"),
          protein: 6,
          fiber: 2,
          fruitVegPct: null,
        },
        ingredientsText: review.ingredients,
        ingredients: [],
        allergens: [],
        mayContain: [],
        addedAt: "2026-11-04",
        source: ro.capture.preview.localOnly,
      };
      await saveToHistory({
        product,
        score: {
          score: null,
          letter: null,
          grade: "unavailable",
          reasons: [],
          missing: [],
        },
      });
      router.replace(`/product/${product.id}`);
    } catch {
      setError(ro.history.storageError);
    } finally {
      setSaving(false);
    }
  }
  const photo =
    flow.step === "capture" ||
    flow.step === "ingredientsPhoto" ||
    flow.step === "nutritionPhoto";
  return (
    <Screen title={ro.capture.preview.title} back>
      <Badge>{ro.app.demo}</Badge>
      <Body style={{ fontSize: 12, color: colors.muted }}>
        {ro.capture.preview.note}
      </Body>
      {photo && (
        <>
          <Heading>
            {flow.step === "capture"
              ? ro.capture.title
              : flow.step === "ingredientsPhoto"
                ? ro.add.ingredients
                : ro.add.nutrition}
          </Heading>
          {denied ? (
            <Card>
              <Icon name="camera" size={40} />
              <Body>{ro.capture.denied}</Body>
              <Button icon="camera" onPress={() => move("photo")}>
                {ro.capture.gallery}
              </Button>
              <Button variant="ghost" onPress={() => setDenied(false)}>
                {ro.capture.preview.restoreCamera}
              </Button>
            </Card>
          ) : (
            <>
              <View
                style={{
                  minHeight: 310,
                  borderRadius: 26,
                  backgroundColor: colors.hero,
                  padding: 28,
                  justifyContent: "center",
                  gap: 22,
                }}
              >
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: colors.accent,
                    borderRadius: 20,
                    padding: 18,
                  }}
                >
                  {flow.step === "capture" ? (
                    <Pack />
                  ) : (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 10,
                        padding: 16,
                        gap: 10,
                      }}
                    >
                      <Heading style={{ fontSize: 18 }}>
                        {flow.step === "ingredientsPhoto"
                          ? ro.ingredients.title
                          : ro.result.per100("g")}
                      </Heading>
                      <Body style={{ fontSize: 12, lineHeight: 20 }}>
                        {flow.step === "ingredientsPhoto"
                          ? ro.capture.preview.sampleIngredients
                          : ro.capture.preview.sampleNutrients}
                      </Body>
                    </View>
                  )}
                </View>
                <Body
                  style={{
                    color: colors.heroMuted,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {ro.capture.hint}
                </Body>
              </View>
              <Button icon="camera" onPress={() => move("photo")}>
                {ro.capture.preview.usePhoto}
              </Button>
              <Button variant="ghost" onPress={() => move("photo")}>
                {ro.capture.gallery}
              </Button>
            </>
          )}
          <Button variant="ghost" onPress={() => setDenied(true)}>
            {ro.capture.preview.cameraDenied}
          </Button>
        </>
      )}
      {flow.step === "scan" && (
        <ScannerScreen
          code={code}
          setCode={setCode}
          setError={setError}
          findCode={findCode}
          onExample={() => router.push(`/product/${entry.product.id}`)}
        />
      )}
      {flow.step === "confirm" && (
        <ConfirmProductScreen
          product={entry.product}
          onConfirm={() => router.replace(`/product/${entry.product.id}`)}
          onReject={() => move("unknown")}
        />
      )}
      {flow.step === "notFound" && (
        <Card>
          <Icon name="tag" size={44} color={colors.primary} />
          <Heading>{ro.identify.notFound}</Heading>
          <Body>{ro.identify.description}</Body>
          <Button icon="camera" onPress={() => move("add")}>
            {ro.identify.add}
          </Button>
        </Card>
      )}
      {flow.step === "review" && (
        <>
          <Heading>{ro.review.title}</Heading>
          <Card>
            <Body>{ro.capture.preview.newProduct}</Body>
            <Body>{ro.ingredients.title}</Body>
            <TextInput
              accessibilityLabel={ro.ingredients.title}
              value={review.ingredients}
              onChangeText={(value) =>
                setReview({ ...review, ingredients: value })
              }
              multiline
              style={{
                minHeight: 110,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 12,
                borderRadius: 10,
                color: colors.ink,
                fontSize: 16,
              }}
            />
            {(["kcal", "fat", "sugar", "sat", "salt"] as const).map((key) => (
              <View key={key} style={{ gap: 6 }}>
                <Body>{ro.result.nutrients[key]}</Body>
                <TextInput
                  accessibilityLabel={ro.result.nutrients[key]}
                  value={review[key]}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setReview({ ...review, [key]: value })
                  }
                  style={{
                    minHeight: 48,
                    borderWidth: 1,
                    borderColor: review[key] ? colors.border : colors.low,
                    borderRadius: 10,
                    padding: 12,
                    color: colors.ink,
                    fontSize: 16,
                  }}
                />
              </View>
            ))}
          </Card>
          <Button disabled={saving} onPress={save}>
            {saving ? ro.app.loading : ro.review.save}
          </Button>
          <Button
            variant="ghost"
            onPress={() => setFlow({ step: "ingredientsPhoto" })}
          >
            {ro.review.retake}
          </Button>
        </>
      )}
      {!!error && (
        <Body accessibilityLiveRegion="polite" style={{ color: colors.low }}>
          {error}
        </Body>
      )}
      <View
        style={{
          gap: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Body style={{ fontSize: 12, color: colors.muted }}>
          {ro.capture.preview.states}
        </Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button variant="secondary" onPress={() => move("unknown")}>
            {ro.capture.preview.unknown}
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              router.push(`/product/${previewEntries[5]!.product.id}`)
            }
          >
            {ro.result.insufficient}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              setReview({
                ...review,
                sugar: "",
                ingredients: review.ingredients.replace("zahăr", "zah[?]r"),
              });
              setFlow({ step: "review" });
            }}
          >
            {ro.capture.preview.unclear}
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push(routes.offline)}
          >
            {ro.offline.title}
          </Button>
        </View>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={ro.nav.home}
        onPress={() => router.replace(routes.home)}
        style={{
          minHeight: 48,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Body>{ro.nav.home}</Body>
      </Pressable>
    </Screen>
  );
}
