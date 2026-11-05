import { View } from "react-native";
import type { Allergen } from "../../data/models/contract";
import { Body } from "./typography";
import { useTheme } from "../../core/theme/app_theme";
export function AllergenChip({ name }: { name: Allergen }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 22,
        backgroundColor: colors.warn,
      }}
    >
      <Body
        style={{
          color: "#FFFFFF",
          fontWeight: "800",
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {name}
      </Body>
    </View>
  );
}
