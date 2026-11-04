import { View } from "react-native";
import type { Allergen } from "@okbite/shared";
import { Body } from "./Typography";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
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
