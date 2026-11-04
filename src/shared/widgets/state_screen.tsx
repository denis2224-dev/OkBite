import type { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  View,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "../../core/theme/app_theme";
import { useDemoState, isPreview } from "../state/app_state";
import { Body, Heading } from "./typography";
import { Icon } from "./app_icon";
import { ro } from "../../core/constants/strings_ro";
export function Screen({
  title,
  back,
  children,
  header,
  footer,
  right,
  onBack,
  tone = "default",
  scroll = true,
  contentStyle,
  titleSize = 18,
}: PropsWithChildren<{
  title?: string;
  back?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  tone?: "default" | "camera";
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  titleSize?: number;
}>) {
  const { colors } = useTheme();
  const demo = useDemoState();
  const background = tone === "camera" ? "#10241A" : colors.ground;
  const foreground = tone === "camera" ? "#FFFFFF" : colors.ink;
  const content = [
    { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 },
    contentStyle,
  ];
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: background }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{ flex: 1, width: "100%", maxWidth: 390, alignSelf: "center" }}
      >
        {isPreview && demo.offline && (
          <View
            style={{
              backgroundColor: "#3F4842",
              padding: 7,
              flexDirection: "row",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <Icon name="offline" size={16} color="#FFFFFF" />
            <Body
              accessibilityLiveRegion="polite"
              style={{
                fontSize: 12,
                lineHeight: 17,
                color: "#FFFFFF",
                fontWeight: "700",
              }}
            >
              {ro.offline.banner}
            </Body>
          </View>
        )}
        {header ??
          (title ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 6,
                minHeight: 58,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {back && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ro.app.back}
                  onPress={
                    onBack ??
                    (() =>
                      router.canGoBack() ? router.back() : router.replace("/"))
                  }
                  hitSlop={6}
                  style={{ minHeight: 44, width: 44, justifyContent: "center" }}
                >
                  <Icon name="back" color={foreground} />
                </Pressable>
              )}
              <Heading
                style={{
                  fontSize: titleSize,
                  lineHeight: 24,
                  color: foreground,
                  flex: 1,
                }}
              >
                {title}
              </Heading>
              {right}
            </View>
          ) : null)}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={content}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, content]}>{children}</View>
        )}
        {footer && (
          <View
            style={{
              backgroundColor: background,
              borderTopWidth: tone === "camera" ? 0 : 1,
              borderTopColor: "#E8E1D3",
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 12,
              gap: 8,
            }}
          >
            {footer}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
