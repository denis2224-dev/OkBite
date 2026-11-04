import { Platform, View, TextInput, Pressable } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { Heading, Card, Icon, Body, Button } from "../../shared/widgets";
import { Pack } from "../../shared/widgets/product_pack";
import { previewEntries } from "../../data/mock/mock_products";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
import { fonts } from "../../core/theme/typography";
type Props = {
  code: string;
  setCode: (v: string) => void;
  setError: (v: string) => void;
  findCode: () => void;
  onExample: () => void;
  onScanCode?: (v: string) => void;
  camDenied?: boolean;
  onAllow?: () => void;
};
export function ScannerScreen({
  code,
  setCode,
  setError,
  findCode,
  onExample,
  onScanCode,
  camDenied,
  onAllow,
}: Props) {
  const { colors } = useTheme(),
    d = ro.app.design;
  const samples = [
    ["Iaurt natural", "4840001000017"],
    ["Iaurt cu căpșuni", "4840001000024"],
    ["Iaurt grecesc", "4840001000031"],
    ["Biscuiți ovăz", "4840001000048"],
    ["Suc de mere", "4840001000055"],
    [d.unknown, "4841234567890"],
  ];
  return (
    <>
      {camDenied ? (
        <Card style={{ alignItems: "center", padding: 18, gap: 12 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.lowBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cameraOff" size={30} color={colors.low} />
          </View>
          <Heading style={{ fontSize: 20, textAlign: "center" }}>
            {d.deniedTitle}
          </Heading>
          <Body
            style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}
          >
            {d.scanDenied}
          </Body>
          <Button onPress={onAllow} style={{ alignSelf: "stretch" }}>
            {d.allow}
          </Button>
        </Card>
      ) : (
        <View
          style={{
            height: 320,
            borderRadius: 24,
            backgroundColor: "#10241A",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 32,
              left: -40,
              opacity: 0.13,
              transform: [{ rotate: "-6deg" }],
            }}
          >
            <Pack
              product={previewEntries[0]!.product}
              width={145}
              height={165}
            />
          </View>
          <View
            style={{
              position: "absolute",
              right: -40,
              top: 60,
              opacity: 0.09,
              transform: [{ rotate: "5deg" }],
            }}
          >
            <Pack
              product={previewEntries[3]!.product}
              width={145}
              height={195}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ro.capture.preview.usePhoto}
            onPress={onExample}
            style={{
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: 20,
              padding: 12,
              width: "81%",
              height: 172,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#F5F3ED",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
                height: 140,
              }}
            >
              <Svg
                width="100%"
                height={95}
                viewBox="0 0 220 95"
                accessible={Platform.OS === "web" ? undefined : false}
                aria-hidden
              >
                {Array.from({ length: 45 }, (_, i) => (
                  <Rect
                    key={i}
                    x={8 + i * 4.5}
                    y={7}
                    width={i % 4 === 0 ? 3.5 : i % 3 === 0 ? 1 : 2}
                    height={65}
                    fill="#1C2420"
                  />
                ))}
                <Line
                  x1={0}
                  x2={220}
                  y1={59}
                  y2={59}
                  stroke="#C8E07A"
                  strokeWidth={2}
                />
                <SvgText
                  x={110}
                  y={86}
                  textAnchor="middle"
                  fontSize={10}
                  letterSpacing={3}
                  fill="#1C2420"
                >
                  {"4840001000024"}
                </SvgText>
              </Svg>
            </View>
          </Pressable>
          <Body
            style={{
              position: "absolute",
              bottom: 18,
              fontSize: 15,
              fontWeight: "700",
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            {d.viewfinder}
          </Body>
        </View>
      )}
      <Card style={{ gap: 6 }}>
        <Body style={{ fontSize: 16, fontWeight: "800" }}>
          {ro.scan.manual}
        </Body>
        <Body style={{ fontSize: 13, color: colors.muted }}>
          {d.manualHint}
        </Body>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <TextInput
            accessibilityLabel={ro.scan.manualLabel}
            keyboardType="number-pad"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/D/g, ""));
              setError("");
            }}
            onSubmitEditing={findCode}
            placeholder={ro.scan.manualPlaceholder}
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              minHeight: 48,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              color: colors.ink,
              fontFamily: fonts.medium,
              fontSize: 16,
            }}
          />
          <Button onPress={findCode}>{ro.scan.submit}</Button>
        </View>
      </Card>
      <Body
        style={{
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.7,
          textTransform: "uppercase",
          color: colors.muted,
          marginTop: 6,
        }}
      >
        {d.simulate}
      </Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {samples.map(([label, value]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onScanCode?.(value!)}
            style={{
              minHeight: 44,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 22,
              backgroundColor: colors.surface,
              justifyContent: "center",
            }}
          >
            <Body style={{ fontSize: 12, fontWeight: "700" }}>{label}</Body>
          </Pressable>
        ))}
      </View>
    </>
  );
}
