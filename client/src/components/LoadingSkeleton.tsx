import { View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { ro } from "../copy/ro";
export function LoadingSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={ro.app.loading}
      style={{ gap: 20 }}
    >
      {[80, 180, 220].map((height, i) => (
        <View
          key={i}
          style={{ height, borderRadius: 22, backgroundColor: colors.soft }}
        />
      ))}
    </View>
  );
}
