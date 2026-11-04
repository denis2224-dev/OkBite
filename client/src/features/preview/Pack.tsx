import { View } from "react-native";
import { Body, Icon } from "../../components";
import { useTheme } from "../../hooks/useTheme";
import { fonts } from "../../theme/tokens";
import { ro } from "../../copy/ro";
export function Pack({
  name = ro.capture.preview.yogurt,
  brand = ro.capture.preview.brand,
}: {
  name?: string;
  brand?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{ width: 160, alignSelf: "center", alignItems: "center" }}
    >
      <View
        style={{
          height: 16,
          width: 160,
          borderRadius: 8,
          backgroundColor: colors.primary,
          marginBottom: -4,
          zIndex: 1,
        }}
      />
      <View
        style={{
          width: 145,
          minHeight: 176,
          backgroundColor: colors.surface,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          padding: 16,
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Body
          style={{
            fontSize: 12,
            color: colors.primary,
            fontFamily: fonts.bold,
            textAlign: "center",
          }}
        >
          {brand}
        </Body>
        <Icon name="leaf" size={38} color={colors.primary} />
        <Body
          style={{
            fontFamily: fonts.heading,
            fontSize: 21,
            lineHeight: 24,
            textAlign: "center",
          }}
        >
          {name}
        </Body>
        <Body style={{ fontSize: 10, color: colors.muted }}>
          {ro.capture.preview.packNote}
        </Body>
      </View>
    </View>
  );
}
