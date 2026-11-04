import { View } from "react-native";
import type { Allergen } from "../../data/models/contract";
import { Body } from "./typography";
import { useTheme } from "../../core/theme/app_theme";
import { Icon } from "./app_icon";
export function AllergenChip({ name }: { name: Allergen }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.lowBg,
      }}
    >
      <Icon name="alert" size={16} color={colors.low} />
      <Body style={{ color: colors.low, fontWeight: "700" }}>{name}</Body>
    </View>
  );
}
