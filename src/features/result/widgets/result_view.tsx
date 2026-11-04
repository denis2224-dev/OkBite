import { routes } from "../../../core/router/routes";
import { useState } from "react";
import { View } from "react-native";
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
import { ro } from "../../../core/constants/strings_ro";
import { useTheme } from "../../../core/theme/app_theme";
import { isPreview } from "../../../shared/state/app_state";
import { ScoreCard } from "./score_card";
import { PortionTable } from "./portion_table";
import { SourceCard } from "./source_card";
import { shareProduct } from "../../share/share_product";
import { useToast } from "../../../shared/widgets/toast";
import { ReportSheet } from "./report_sheet";
export function ResultView({
  product,
  score,
}: {
  product: Product;
  score: ScoreResult;
}) {
  const { colors } = useTheme();
  const [report, setReport] = useState(false);
  const toast = useToast();
  async function share() {
    try {
      const result = await shareProduct(product, score);
      if (result === "copied") toast(ro.share.copied);
    } catch {
      toast(ro.share.error);
    }
  }
  return (
    <>
      {isPreview && (
        <>
          <Badge>{ro.app.demo}</Badge>
          <Body style={{ fontSize: 12, color: colors.muted }}>
            {ro.app.demoNote}
          </Body>
        </>
      )}
      <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
        <View
          style={{
            width: 74,
            height: 94,
            backgroundColor: colors.soft,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="leaf" size={36} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Body style={{ fontSize: 12, color: colors.muted }}>
            {product.brand}
          </Body>
          <Heading style={{ fontSize: 27, lineHeight: 31 }}>
            {product.name}
          </Heading>
          <Body style={{ fontSize: 13, color: colors.muted }}>
            {product.quantity}
          </Body>
        </View>
      </View>
      {product.status === "unverified" && (
        <Badge tone="unverified">{ro.result.unverified}</Badge>
      )}
      <Card
        style={{ backgroundColor: colors.lowBg, borderColor: colors.lowBg }}
      >
        <Heading style={{ fontSize: 18, color: colors.low }}>
          {ro.result.allergens}
        </Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {product.allergens.map((name) => (
            <AllergenChip key={name} name={name} />
          ))}
        </View>
        {!product.allergens.length && (
          <Body>
            {isPreview && !product.ingredients.length
              ? ro.result.allergensPending
              : ro.result.noAllergens}
          </Body>
        )}
        {!!product.mayContain.length && (
          <Body style={{ fontSize: 13 }}>
            {ro.result.mayContain}: {product.mayContain.join(", ")}
          </Body>
        )}
        <Body style={{ fontSize: 12, lineHeight: 18, color: colors.low }}>
          {ro.result.allergyNote}
        </Body>
      </Card>
      <ScoreCard score={score} />
      <PortionTable product={product} />
      <Button
        variant="secondary"
        icon="book"
        onPress={() =>
          router.push(
            isPreview
              ? `/preview?step=ingredients&id=${product.id}`
              : `/product/${product.id}/ingredients`,
          )
        }
      >
        {ro.result.ingredients}
      </Button>
      <Button
        variant="secondary"
        icon="compare"
        onPress={() => router.push(routes.compare)}
      >
        {ro.result.compare}
      </Button>
      <SourceCard product={product} />
      {!isPreview && (
        <Button variant="secondary" icon="share" onPress={share}>
          {ro.share.button}
        </Button>
      )}
      <Button
        variant="ghost"
        icon="book"
        onPress={() =>
          router.push(
            isPreview
              ? `/preview?step=label&id=${product.id}`
              : `/product/${product.id}/label`,
          )
        }
      >
        {ro.result.original}
      </Button>
      <Button variant="ghost" onPress={() => setReport(true)}>
        {ro.result.report}
      </Button>
      <ReportSheet
        productId={product.id}
        visible={report}
        onClose={() => setReport(false)}
      />
    </>
  );
}
