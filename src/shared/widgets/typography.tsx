import { Text, StyleSheet, type TextProps } from "react-native";
import { useTheme } from "../../core/theme/app_theme";
import { fonts, bodyFonts, headingFonts } from "../../core/theme/typography";
function Typography({
  style,
  heading = false,
  ...props
}: TextProps & { heading?: boolean }) {
  const { colors } = useTheme();
  const flat = StyleSheet.flatten(style) || {};
  const size = flat.fontSize ?? (heading ? 18 : 14);
  const family = flat.fontFamily ?? (heading ? fonts.heading : fonts.body);
  const weight = String(flat.fontWeight ?? (heading ? "800" : "400"));
  const selected = flat.fontWeight
    ? family.startsWith("Bricolage")
      ? (headingFonts[weight] ?? fonts.heading)
      : (bodyFonts[weight] ?? fonts.bold)
    : family;
  return (
    <Text
      {...props}
      allowFontScaling
      style={[
        {
          fontSize: size,
          lineHeight: size * (heading ? 1.15 : 1.45),
          color: colors.ink,
        },
        style,
        { fontFamily: selected, fontWeight: "normal" },
      ]}
    />
  );
}
export function Body(props: TextProps) {
  return <Typography {...props} />;
}
export function Heading(props: TextProps) {
  return <Typography {...props} heading accessibilityRole="header" />;
}
