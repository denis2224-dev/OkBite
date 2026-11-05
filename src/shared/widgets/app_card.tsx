import { View, type ViewProps } from "react-native";
import { useTheme } from "../../core/theme/app_theme";
export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    />
  );
}
