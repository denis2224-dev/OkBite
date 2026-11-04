import { View } from "react-native";
import type { PropsWithChildren } from "react";
import { Body } from "./Typography";
import { useTheme } from "../theme/useTheme";
export function Badge({
  children,
  tone = "info",
}: PropsWithChildren<{ tone?: "unverified" | "info" }>) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor:
          tone === "unverified" ? colors.mediumBg : colors.neutralBg,
        borderRadius: 9,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Body
        style={{
          fontSize: 12,
          lineHeight: 18,
          color: tone === "unverified" ? colors.medium : colors.neutral,
        }}
      >
        {children}
      </Body>
    </View>
  );
}
