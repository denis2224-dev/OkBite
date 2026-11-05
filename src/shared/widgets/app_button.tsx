import { Pressable, type PressableProps, View } from "react-native";
import { useTheme } from "../../core/theme/app_theme";
import { Body } from "./typography";
import { Icon, type IconName } from "./app_icon";
import { pressFeedback } from "../../core/utils/feedback";
import { fonts } from "../../core/theme/typography";
type Props = PressableProps & {
  children: string;
  variant?: "primary" | "secondary" | "ghost" | "accent" | "soft";
  icon?: IconName;
};
export function Button({
  children,
  variant = "primary",
  icon,
  disabled,
  style,
  onPress,
  ...props
}: Props) {
  const { colors } = useTheme();
  const fg =
    variant === "primary"
      ? colors.onPrimary
      : variant === "accent"
        ? colors.onAccent
        : colors.forest;
  return (
    <Pressable
      {...props}
      onPress={(event) => {
        if (variant === "primary" || variant === "accent") pressFeedback();
        onPress?.(event);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? children}
      accessibilityState={{ disabled: !!disabled }}
      style={(state) => [
        {
          minHeight: 48,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 11,
          justifyContent: "center",
          opacity: disabled ? 0.45 : state.pressed ? 0.75 : 1,
          backgroundColor:
            variant === "primary"
              ? colors.primary
              : variant === "accent"
                ? colors.accent
                : variant === "soft"
                  ? colors.mint
                  : variant === "secondary"
                    ? colors.surface
                    : "transparent",
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon && <Icon name={icon} color={fg} />}
        <Body
          style={{
            color: fg,
            fontFamily: fonts.bold,
            fontSize: 15,
            lineHeight: 21,
            textAlign: "center",
            flexShrink: 1,
          }}
        >
          {children}
        </Body>
      </View>
    </Pressable>
  );
}
