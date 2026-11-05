import { View } from "react-native";
import type { Product } from "../../../data/models/contract";
import { Card, Body, Heading, Button } from "../../../shared/widgets";
import { ro } from "../../../core/constants/strings_ro";
import { useTheme } from "../../../core/theme/app_theme";
import { visualFor } from "../../../data/mock/mock_products";
export function SourceCard({
  product,
  onLabel,
}: {
  product: Product;
  onLabel?: () => void;
}) {
  const { colors } = useTheme(),
    v = visualFor(product),
    d = ro.app.design;
  return (
    <Card>
      <Heading style={{ fontSize: 18 }}>{ro.result.source}</Heading>
      {[
        [d.source, product.source],
        [d.photo, v.photo],
        [
          d.verified,
          product.status === "unverified"
            ? ro.result.unverifiedNote
            : v.checked,
        ],
      ].map(([label, value]) => (
        <View key={label} style={{ flexDirection: "row", gap: 10 }}>
          <Body style={{ width: 74, fontSize: 12, color: colors.muted }}>
            {label}
          </Body>
          <Body style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>{value}</Body>
        </View>
      ))}
      {onLabel && (
        <Button variant="secondary" icon="document" onPress={onLabel}>
          {ro.result.original}
        </Button>
      )}
    </Card>
  );
}
