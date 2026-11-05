import { Platform, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { Product } from "../../data/models/contract";
import {
  visualFor,
  packSvgs,
  previewEntries,
} from "../../data/mock/mock_products";
import { Body } from "./typography";
import { ro } from "../../core/constants/strings_ro";
export function Pack({
  product = previewEntries[0]!.product,
  width = 168,
  height = 176,
  badge = false,
}: {
  product?: Product;
  name?: string;
  brand?: string;
  width?: number;
  height?: number;
  badge?: boolean;
}) {
  const meta = visualFor(product);
  const xml = packSvgs[meta.kind]
    .replace(' aria-hidden="true"', "")
    .replaceAll("{{v.lid}}", meta.lid)
    .replaceAll("{{v.short}}", meta.short)
    .replace("Manrope, sans-serif", "Manrope_800ExtraBold")
    .replace('font-weight="800"', 'font-weight="normal"');
  return (
    <View
      accessible
      accessibilityLabel={product.name}
      style={{
        width,
        height,
        borderRadius: 20,
        backgroundColor: meta.tint,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <SvgXml
        xml={xml}
        override={{
          width: width * 0.72,
          height: height * 0.86,
          accessible: Platform.OS === "web" ? undefined : false,
          "aria-hidden": true,
        }}
      />
      {badge && (
        <View
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Body style={{ fontSize: 10, lineHeight: 13, fontWeight: "800" }}>
            {ro.app.design.photoDemo}
          </Body>
        </View>
      )}
    </View>
  );
}
