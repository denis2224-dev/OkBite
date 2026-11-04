import { Heading, Card, Body, Button } from "../../shared/widgets";
import { Pack } from "../../shared/widgets/product_pack";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
type Props = {
  product: { name: string; brand: string };
  onConfirm: () => void;
  onReject: () => void;
};
export function ConfirmProductScreen({ product, onConfirm, onReject }: Props) {
  const { colors } = useTheme();
  return (
    <>
      <Heading>{ro.identify.confirm}</Heading>
      <Card style={{ paddingVertical: 28, alignItems: "center" }}>
        <Pack />
        <Heading style={{ marginTop: 12, textAlign: "center" }}>
          {product.name}
        </Heading>
        <Body style={{ color: colors.muted }}>{product.brand}</Body>
      </Card>
      <Button icon="check" onPress={onConfirm}>
        {ro.identify.yes}
      </Button>
      <Button variant="secondary" onPress={onReject}>
        {ro.identify.none}
      </Button>
    </>
  );
}
