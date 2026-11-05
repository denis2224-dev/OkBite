import { useState } from "react";
import { View, Modal, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import type { Product, ScoreResult } from "../../../data/models/contract";
import {
  Body,
  Heading,
  Card,
  AllergenChip,
  Badge,
  Button,
  Icon,
} from "../../../shared/widgets";
import { Pack } from "../../../shared/widgets/product_pack";
import { ro } from "../../../core/constants/strings_ro";
import { useTheme } from "../../../core/theme/app_theme";
import { isPreview, useDemoState } from "../../../shared/state/app_state";
import { visualFor } from "../../../data/mock/mock_products";
import { ScoreCard } from "./score_card";
import { PortionTable } from "./portion_table";
import { SourceCard } from "./source_card";
import { shareProduct } from "../../share/share_product";
import { useToast } from "../../../shared/widgets/toast";
import { ReportSheet } from "./report_sheet";
import { LabelContent } from "../../ingredients/ingredients_screen";
export function LabelSheet({
  product,
  visible,
  onClose,
}: {
  product: Product;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
          onPress={onClose}
          style={{ minHeight: 44, flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "86%",
            backgroundColor: colors.ground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 18,
            gap: 12,
            width: "100%",
            maxWidth: 390,
            alignSelf: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Heading style={{ fontSize: 21, flex: 1 }}>
              {ro.app.design.labelTitle}
            </Heading>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ro.app.close}
              onPress={onClose}
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
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
            <LabelContent product={product} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function ResultView({
  product,
  score,
  onLabel,
}: {
  product: Product;
  score: ScoreResult;
  onLabel?: () => void;
}) {
  const { colors } = useTheme(),
    demo = useDemoState(),
    toast = useToast(),
    d = ro.app.design;
  const [report, setReport] = useState(false),
    [label, setLabel] = useState(false);
  async function share() {
    try {
      if ((await shareProduct(product, score)) === "copied")
        toast(ro.share.copied);
    } catch {
      toast(ro.share.error);
    }
  }
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          gap: 14,
          alignItems: "center",
          paddingBottom: 2,
        }}
      >
        <Pack product={product} width={104} height={112} />
        <View style={{ flex: 1, gap: 3 }}>
          <Heading style={{ fontSize: 22, lineHeight: 25.3 }}>
            {product.name}
          </Heading>
          <Body style={{ fontSize: 13, color: colors.muted }}>
            {product.brand} · {product.quantity}
          </Body>
          <Body style={{ fontSize: 11, lineHeight: 16, color: colors.muted }}>
            Cod {product.code ?? "—"}
          </Body>
        </View>
      </View>
      {product.status === "unverified" && (
        <Badge tone="unverified">{ro.result.unverified}</Badge>
      )}
      <Card
        style={{
          backgroundColor: colors.warnBg,
          borderColor: "#EAD394",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Icon name="alert" size={18} color={colors.warn} />
          <Body style={{ fontWeight: "800", color: colors.warn }}>
            {ro.result.allergens}
          </Body>
        </View>
        {product.allergens.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {product.allergens.map((name) => (
              <AllergenChip key={name} name={name} />
            ))}
          </View>
        ) : (
          <Body style={{ fontSize: 13, color: colors.warn }}>
            {ro.result.noAllergens}
          </Body>
        )}
        {!!product.mayContain.length && (
          <View style={{ gap: 5 }}>
            <Body
              style={{ fontSize: 12, fontWeight: "800", color: colors.warn }}
            >
              {ro.result.mayContain}:
            </Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {product.mayContain.map((name) => (
                <View
                  key={name}
                  style={{
                    borderWidth: 1,
                    borderColor: "#C08A1E",
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Body
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.warn,
                    }}
                  >
                    {name}
                  </Body>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
      <ScoreCard
        score={score}
        missingMessage={visualFor(product).missing}
        pending={demo.pendingTables.includes(product.id)}
        onCapture={() => router.push(`/preview?forId=${product.id}`)}
      />
      <PortionTable product={product} />
      <SourceCard
        product={product}
        onLabel={onLabel ?? (() => setLabel(true))}
      />
      {!isPreview && (
        <Button variant="secondary" icon="share" onPress={share}>
          {ro.share.button}
        </Button>
      )}
      <Button
        variant="ghost"
        onPress={() => (isPreview ? toast(d.reportThanks) : setReport(true))}
      >
        {ro.result.report}
      </Button>
      {!onLabel && (
        <LabelSheet
          product={product}
          visible={label}
          onClose={() => setLabel(false)}
        />
      )}
      <ReportSheet
        productId={product.id}
        visible={report}
        onClose={() => setReport(false)}
      />
    </>
  );
}
