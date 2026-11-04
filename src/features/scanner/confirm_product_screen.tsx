import { Heading, Card, Body } from "../../shared/widgets";
import { Pack } from "../../shared/widgets/product_pack";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
import type { Product } from "../../data/models/contract";
export function ConfirmProductScreen({
  product,
}: {
  product: Product;
  onConfirm?: () => void;
  onReject?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <Card style={{ padding: 24, alignItems: "center", gap: 4 }}>
        <Pack product={product} width={168} height={176} badge />
        <Body style={{ fontSize: 13, color: colors.muted, marginTop: 12 }}>
          {ro.scan.manualLabel.replace(" de bare", "")} {product.code}
        </Body>
        <Heading
          style={{ fontSize: 24, lineHeight: 27.6, textAlign: "center" }}
        >
          {product.name}
        </Heading>
        <Body style={{ color: colors.muted }}>
          {product.brand} · {product.quantity}
        </Body>
      </Card>
      <Body
        style={{
          fontSize: 14,
          color: colors.muted,
          textAlign: "center",
          padding: 6,
        }}
      >
        {ro.app.design.confirmHint}
      </Body>
    </>
  );
}
