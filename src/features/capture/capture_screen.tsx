import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Icon,
  AllergenChip,
} from "../../shared/widgets";
import { useTheme } from "../../core/theme/app_theme";
import { fonts } from "../../core/theme/typography";
import { ro, plural } from "../../core/constants/strings_ro";
import { barcodeError } from "../../core/utils/barcode_validator";
import { previewEntries, napIngredients } from "../../data/mock/mock_products";
import { ocrFor, detectAllergens } from "../../data/mock/mock_ocr";
import {
  useDemoState,
  demoActions,
  resolveDemoCode,
  type DemoEntry,
} from "../../shared/state/app_state";
import { useToast } from "../../shared/widgets/toast";
import { saveToHistory } from "../../data/repositories/history_repository";
import { ScannerScreen } from "../scanner/scanner_screen";
import { ConfirmProductScreen } from "../scanner/confirm_product_screen";
import { OfflineContent } from "../states/offline_screen";
import {
  reviewError,
  previewScore,
  nutrientKeys,
  type Step,
  type Review,
} from "./capture_controller";
export function WorkflowPreview({
  initial = "ingredientsPhoto",
  initialCode = "",
  initialId,
  forId,
}: {
  initial?: Step;
  initialCode?: string;
  initialId?: string;
  forId?: string;
}) {
  const { colors } = useTheme(),
    demo = useDemoState(),
    toast = useToast(),
    d = ro.app.design;
  const tableOnly = !!forId;
  const [step, setStep] = useState<Step>(
      tableOnly
        ? "nutritionPhoto"
        : initial === "capture"
          ? "ingredientsPhoto"
          : initial,
    ),
    [stack, setStack] = useState<Step[]>([]),
    [code, setCode] = useState(initialCode),
    [error, setError] = useState(""),
    [review, setReview] = useState<Review>(() =>
      ocrFor(demo.ocrUnclear, tableOnly),
    ),
    [entry, setEntry] = useState<DemoEntry>(
      () => demo.products[initialId ?? ""] ?? previewEntries[1]!,
    ),
    [saving, setSaving] = useState(false);
  function move(target: Step, replace = false) {
    setError("");
    if (!replace) setStack((s) => [...s, step]);
    setStep(target);
  }
  function back() {
    setError("");
    if (stack.length) {
      setStep(stack[stack.length - 1]!);
      setStack(stack.slice(0, -1));
    } else if (router.canGoBack()) router.back();
    else router.replace("/");
  }
  function scan(value = code, online = false) {
    const problem = barcodeError(value);
    if (problem) {
      setError(problem);
      toast(problem);
      return;
    }
    setCode(value);
    const found = resolveDemoCode(value, online);
    setError("");
    if (found.entry) setEntry(found.entry);
    if (found.screen === "result" && found.entry) {
      toast(d.cached);
      router.push(`/product/${found.entry.product.id}`);
      return;
    }
    move(found.screen);
  }
  async function confirm() {
    demoActions.addHistory(entry);
    try {
      await saveToHistory(entry);
    } catch {
      toast(ro.history.storageError);
    }
    setStep("scan");
    setStack([]);
    router.push(`/product/${entry.product.id}`);
  }
  function photo() {
    if (step === "ingredientsPhoto") {
      toast(d.ingredientsShot);
      move("nutritionPhoto");
    } else {
      setReview(ocrFor(demo.ocrUnclear, tableOnly));
      move("review");
    }
  }
  async function save() {
    const problem = reviewError(review);
    if (problem) {
      setError(problem);
      toast(problem);
      return;
    }
    if (tableOnly) {
      demoActions.markPending(forId!);
      toast(d.tableSent);
      if (router.canGoBack()) router.back();
      else router.replace(`/product/${forId}`);
      return;
    }
    setSaving(true);
    const n = Object.fromEntries(
      nutrientKeys.map((key) => [key, Number(review[key].replace(",", "."))]),
    );
    const allergens = detectAllergens(review.ingredients);
    const product = {
      ...previewEntries[0]!.product,
      id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e7f",
      code: code.length === 8 || code.length === 13 ? code : null,
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
        kcal: n.kcal!,
        fat: n.fat!,
        sat: n.sat!,
        sugar: n.sugar!,
        salt: n.salt!,
        protein: n.protein!,
        fiber: n.fiber!,
        fruitVegPct: null,
      },
      ingredientsText: review.ingredients,
      ingredients: napIngredients.filter((i) =>
        review.ingredients
          .toLowerCase()
          .includes(i.name.toLowerCase().split(" (")[0]!),
      ),
      allergens,
      mayContain: [],
      addedAt: new Date().toISOString().slice(0, 10),
      source: "Fotografie de etichetă · contribuție utilizator",
      imageUrl: null,
      labelImageUrl: null,
    };
    const saved = { product, score: previewScore(product.nutrients) };
    demoActions.addHistory(saved);
    try {
      await saveToHistory(saved);
    } catch {
      toast(ro.history.storageError);
    } finally {
      setSaving(false);
    }
    toast(d.saved);
    router.replace(`/product/${product.id}`);
  }
  const camera = step === "ingredientsPhoto" || step === "nutritionPhoto";
  const unclear =
    review.ingredients.includes("[?]") ||
    nutrientKeys.some((k) => !review[k].trim());
  const zones =
    (review.ingredients.match(/\[\?\]/g)?.length ? 1 : 0) +
    nutrientKeys.filter((k) => !review[k].trim()).length;
  const title =
    step === "scan"
      ? ro.scan.title
      : step === "confirm"
        ? ro.identify.confirm
        : step === "notFound"
          ? d.notFoundTitle
          : step === "offline"
            ? ro.offline.title
            : step === "review"
              ? ro.review.title
              : tableOnly
                ? d.tableTitle
                : `Pasul ${step === "ingredientsPhoto" ? 1 : 2} din 2`;
  const footer =
    step === "confirm" ? (
      <>
        <Button icon="check" onPress={confirm}>
          {ro.identify.yes}
        </Button>
        <Button variant="secondary" onPress={() => move("notFound", true)}>
          {ro.identify.none}
        </Button>
      </>
    ) : step === "notFound" ? (
      <>
        <Button icon="camera" onPress={() => move("ingredientsPhoto")}>
          {ro.identify.add}
        </Button>
        <Button variant="secondary" onPress={() => move("scan")}>
          {d.checkCode}
        </Button>
      </>
    ) : step === "review" ? (
      <>
        <Button icon="check" disabled={saving} onPress={save}>
          {ro.review.save}
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            move(tableOnly ? "nutritionPhoto" : "ingredientsPhoto")
          }
        >
          {d.retakeAll}
        </Button>
      </>
    ) : step === "offline" ? (
      <>
        <Button icon="retry" onPress={() => toast(d.stillOffline)}>
          {ro.app.retry}
        </Button>
        <Button variant="secondary" onPress={() => router.replace("/history")}>
          {ro.offline.history}
        </Button>
      </>
    ) : camera && !demo.camDenied ? (
      <View
        style={{
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor:
              step === "nutritionPhoto" ? colors.accent : "#1B3829",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={step === "nutritionPhoto" ? "check" : "document"}
            color={step === "nutritionPhoto" ? colors.forest : "#D3E1D6"}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ro.capture.take}
          onPress={photo}
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 4,
            borderColor: "#FFFFFF",
            backgroundColor: colors.accent,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ro.capture.gallery}
          onPress={photo}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="gallery" color="#FFFFFF" />
        </Pressable>
      </View>
    ) : undefined;
  return (
    <Screen
      title={title}
      back
      onBack={back}
      tone={camera && !demo.camDenied ? "camera" : "default"}
      footer={footer}
      contentStyle={camera && !demo.camDenied ? { flexGrow: 1 } : undefined}
    >
      {step === "scan" && (
        <ScannerScreen
          code={code}
          setCode={setCode}
          setError={setError}
          findCode={() => scan()}
          onExample={() => scan("4840001000024")}
          onScanCode={(value) => scan(value)}
          camDenied={demo.camDenied}
          onAllow={() => {
            demoActions.setFlag("camDenied", false);
            toast(d.allowed);
          }}
        />
      )}
      {step === "confirm" && <ConfirmProductScreen product={entry.product} />}
      {step === "notFound" && (
        <>
          <View
            style={{
              alignItems: "center",
              gap: 16,
              paddingTop: 18,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.soft,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="barcodeSearch" size={34} color="#3F4842" />
            </View>
            <Heading
              style={{ fontSize: 24, lineHeight: 29, textAlign: "center" }}
            >
              {ro.identify.notFound}
            </Heading>
            <Body style={{ textAlign: "center", color: colors.muted }}>
              Codul{" "}
              <Body style={{ fontWeight: "800" }}>
                {code || "4841234567890"}
              </Body>{" "}
              nu există în baza de date. Îl poți adăuga tu, în aproximativ un
              minut.
            </Body>
          </View>
          <Card>
            <Body
              style={{
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.7,
                color: colors.muted,
                textTransform: "uppercase",
              }}
            >
              {d.next}
            </Body>
            {[d.stepIngredients, d.stepNutrition, d.stepReview].map(
              (text, i) => (
                <View
                  key={text}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: colors.mint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Body style={{ fontWeight: "800", color: colors.forest }}>
                      {i + 1}
                    </Body>
                  </View>
                  <Body style={{ flex: 1 }}>{text}</Body>
                </View>
              ),
            )}
          </Card>
        </>
      )}
      {step === "offline" && (
        <OfflineContent
          code={code}
          onReconnect={() => {
            toast(d.reconnected);
            scan(code, true);
          }}
        />
      )}
      {camera &&
        (demo.camDenied ? (
          <Card style={{ alignItems: "center", gap: 12 }}>
            <Icon name="cameraOff" size={40} color={colors.low} />
            <Heading style={{ fontSize: 20 }}>{d.deniedTitle}</Heading>
            <Body style={{ color: colors.muted, textAlign: "center" }}>
              {d.captureDenied}
            </Body>
            <Button icon="gallery" onPress={photo}>
              {ro.capture.gallery}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                demoActions.setFlag("camDenied", false);
                toast(d.allowed);
              }}
            >
              {d.allow}
            </Button>
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    height: 5,
                    flex: 1,
                    borderRadius: 3,
                    backgroundColor:
                      i === 1 || step === "nutritionPhoto"
                        ? colors.accent
                        : "#34503C",
                  }}
                />
              ))}
            </View>
            <Body style={{ color: "#D3E1D6" }}>
              {step === "ingredientsPhoto" ? d.ingredientHint : d.nutritionHint}
            </Body>
            <View
              style={{
                minHeight: 380,
                flex: 1,
                borderRadius: 24,
                backgroundColor: "#1A3929",
                padding: 24,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colors.accent,
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#F5EEDB",
                    borderRadius: 5,
                    padding: 16,
                    minHeight: 300,
                    transform: [
                      {
                        rotate: step === "ingredientsPhoto" ? "2deg" : "-2deg",
                      },
                    ],
                    gap: 8,
                  }}
                >
                  <Body
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    {step === "ingredientsPhoto"
                      ? ro.ingredients.title
                      : "VALORI NUTRIȚIONALE / 100 g"}
                  </Body>
                  {step === "ingredientsPhoto" ? (
                    <Body style={{ fontSize: 13, lineHeight: 21 }}>
                      {ro.capture.preview.sampleIngredients}
                    </Body>
                  ) : (
                    Array.from({ length: 8 }, (_, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          gap: 20,
                          borderTopWidth: 1,
                          borderTopColor: "#D7CFBA",
                          paddingTop: 5,
                        }}
                      >
                        <View
                          style={{
                            height: 5,
                            width: `${45 - i * 3}%`,
                            backgroundColor: "#CBC3AC",
                            borderRadius: 3,
                          }}
                        />
                        <View
                          style={{
                            marginLeft: "auto",
                            height: 5,
                            width: 38,
                            backgroundColor: "#CBC3AC",
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          </>
        ))}
      {step === "review" && (
        <>
          <Body style={{ color: colors.muted }}>{d.reviewIntro}</Body>
          {unclear && (
            <Card
              style={{ backgroundColor: colors.warnBg, borderColor: "#EBD08B" }}
            >
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Icon name="alert" color={colors.warn} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Body style={{ fontWeight: "800", color: colors.warn }}>
                    Text neclar în {plural(zones, "zonă", "zone")}
                  </Body>
                  <Body style={{ fontSize: 13, color: colors.warn }}>
                    {d.reviewWarning}
                  </Body>
                  <Button
                    variant="secondary"
                    style={{
                      backgroundColor: "transparent",
                      borderColor: "#B88920",
                      marginTop: 6,
                    }}
                    onPress={() =>
                      move(tableOnly ? "nutritionPhoto" : "ingredientsPhoto")
                    }
                  >
                    {ro.review.retake}
                  </Button>
                </View>
              </View>
            </Card>
          )}
          <Card>
            <Body style={{ fontSize: 16, fontWeight: "800" }}>
              {ro.ingredients.title}
            </Body>
            {review.ingredients.includes("[?]") && (
              <Body
                style={{ fontSize: 12, fontWeight: "800", color: colors.warn }}
              >
                {d.unread}
              </Body>
            )}
            <TextInput
              accessibilityLabel={ro.ingredients.title}
              value={review.ingredients}
              onChangeText={(value) => {
                setReview({ ...review, ingredients: value });
                setError("");
              }}
              multiline
              style={{
                minHeight: 136,
                padding: 12,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: review.ingredients.includes("[?]")
                  ? "#C08A1E"
                  : colors.border,
                borderRadius: 12,
                backgroundColor: review.ingredients.includes("[?]")
                  ? "#FFF9EA"
                  : "#FFFFFF",
                color: colors.ink,
                fontFamily: fonts.body,
                fontSize: 15,
                lineHeight: 23,
              }}
            />
            <Body
              style={{
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: colors.muted,
              }}
            >
              {d.detected}
            </Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              {detectAllergens(review.ingredients).map((name) => (
                <AllergenChip key={name} name={name} />
              ))}
              {!detectAllergens(review.ingredients).length && (
                <Body>{d.noneDetected}</Body>
              )}
            </View>
            <Body style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>
              {d.comparePack}
            </Body>
          </Card>
          <Card>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Body style={{ fontSize: 16, fontWeight: "800" }}>
                {d.nutritionTable}
              </Body>
              <Body style={{ fontSize: 12, color: colors.muted }}>
                la 100 g/ml
              </Body>
            </View>
            {nutrientKeys.map((key) => (
              <View
                key={key}
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <Body style={{ flex: 1, fontSize: 14, fontWeight: "700" }}>
                  {ro.result.nutrients[key]}
                </Body>
                <View style={{ width: 106, gap: 3 }}>
                  <TextInput
                    accessibilityLabel={ro.result.nutrients[key]}
                    value={review[key]}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => {
                      setReview({
                        ...review,
                        [key]: value.replace(/[^\d.,]/g, "").slice(0, 6),
                      });
                      setError("");
                    }}
                    style={{
                      minHeight: 44,
                      textAlign: "right",
                      borderWidth: 1,
                      borderColor: review[key].trim()
                        ? colors.border
                        : "#C08A1E",
                      backgroundColor: review[key].trim()
                        ? "#FFFFFF"
                        : "#FFF9EA",
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      fontSize: 15,
                      fontFamily: fonts.body,
                      color: colors.ink,
                    }}
                  />
                  {!review[key].trim() && (
                    <Body
                      style={{
                        fontSize: 10,
                        lineHeight: 14,
                        color: colors.warn,
                      }}
                    >
                      {d.unclearField}
                    </Body>
                  )}
                </View>
                <Body style={{ width: 22, fontSize: 12, color: colors.muted }}>
                  {key === "kcal" ? "kcal" : "g"}
                </Body>
              </View>
            ))}
          </Card>
        </>
      )}
      {!!error && (
        <Body
          accessibilityLiveRegion="polite"
          style={{ color: colors.low, fontSize: 13 }}
        >
          {error}
        </Body>
      )}
    </Screen>
  );
}
