import { useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ro } from "../../core/constants/strings_ro";
import {
  Screen,
  Body,
  Heading,
  Card,
  Button,
  Icon,
} from "../../shared/widgets";
import { HistoryRows } from "../../shared/widgets/history_rows";
import { useTheme } from "../../core/theme/app_theme";
import { isPreview, useDemoState } from "../../shared/state/app_state";
import {
  listHistory,
  type HistoryEntry,
} from "../../data/repositories/history_repository";
import { DemoStatesSheet } from "./demo_states_sheet";
export default function Home() {
  const { colors } = useTheme(),
    demo = useDemoState();
  const [history, setHistory] = useState<HistoryEntry[]>([]),
    [sheet, setSheet] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (isPreview) return;
      let active = true;
      void listHistory()
        .then((rows) => {
          if (active) setHistory(rows);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );
  const entries = (isPreview ? demo.history : history).slice(0, 3);
  const tab = (path: "/" | "/compare" | "/history") => {
    if (router.canDismiss()) router.dismissAll();
    router.replace(path);
  };
  const header = (
    <View
      style={{
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: colors.forest,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="tag" size={22} color={colors.accent} />
      </View>
      <Heading
        style={{ fontSize: 21, lineHeight: 26, color: colors.forest, flex: 1 }}
      >
        {ro.app.name}
      </Heading>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ro.app.design.demoTitle}
        onPress={() => setSheet(true)}
        style={{
          minHeight: 44,
          flexDirection: "row",
          gap: 7,
          paddingHorizontal: 12,
          alignItems: "center",
          borderRadius: 22,
          backgroundColor: colors.soft,
        }}
      >
        <Icon name="settings" size={18} color={colors.ink} />
        <Body style={{ fontSize: 12, fontWeight: "700" }}>
          {ro.app.design.demoTitle}
        </Body>
      </Pressable>
    </View>
  );
  return (
    <Screen
      header={header}
      footer={
        <Button
          icon="scan"
          onPress={() =>
            router.push(isPreview ? "/preview?step=scan" : ("/scan" as never))
          }
          style={{ minHeight: 62, borderRadius: 20 }}
        >
          {ro.app.design.primaryScan}
        </Button>
      }
    >
      <View
        style={{
          backgroundColor: colors.forest,
          borderRadius: 24,
          paddingTop: 22,
          paddingHorizontal: 20,
          paddingBottom: 24,
          overflow: "hidden",
          marginTop: 0,
        }}
      >
        <View
          style={{ position: "absolute", right: -30, top: -26, opacity: 0.22 }}
        >
          <Icon name="tag" size={150} color={colors.accent} />
        </View>
        <Body
          style={{
            fontSize: 11,
            lineHeight: 16,
            fontWeight: "800",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: colors.accent,
          }}
        >
          {ro.home.eyebrow}
        </Body>
        <Heading
          style={{
            fontSize: 30,
            lineHeight: 32.4,
            fontWeight: "800",
            color: "#FFFFFF",
            maxWidth: 290,
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          {ro.home.title}
        </Heading>
        <Body style={{ fontSize: 15, lineHeight: 22, color: colors.heroMuted }}>
          {ro.home.description}
        </Body>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          {
            icon: "camera" as const,
            title: ro.home.photoButton,
            hint: ro.app.design.photoHint,
            onPress: () =>
              router.push(
                isPreview
                  ? "/preview?step=ingredientsPhoto"
                  : ("/capture" as never),
              ),
          },
          {
            icon: "compare" as const,
            title: ro.home.compare,
            hint: ro.home.compareHint,
            onPress: () => tab("/compare"),
          },
        ].map((action) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={action.onPress}
            style={{ flex: 1 }}
          >
            <Card style={{ flex: 1, padding: 14, gap: 10, minHeight: 125 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: colors.mint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={action.icon} color={colors.forest} />
              </View>
              <View>
                <Body
                  style={{ fontSize: 15, lineHeight: 20, fontWeight: "800" }}
                >
                  {action.title}
                </Body>
                <Body
                  style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}
                >
                  {action.hint}
                </Body>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 0,
        }}
      >
        <Heading style={{ fontSize: 18, lineHeight: 23 }}>
          {ro.home.recent}
        </Heading>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={ro.home.allHistory}
          onPress={() => tab("/history")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Body
            style={{
              fontSize: 12,
              color: colors.forest,
              fontWeight: "800",
              textDecorationLine: "underline",
            }}
          >
            {ro.home.allHistory}
          </Body>
        </Pressable>
      </View>
      {entries.length ? (
        <HistoryRows
          entries={entries}
          onOpen={({ product }) => router.push(`/product/${product.id}`)}
        />
      ) : (
        <Card>
          <Body style={{ color: colors.muted }}>{ro.home.empty}</Body>
        </Card>
      )}
      <Card>
        <Body
          style={{
            fontSize: 11,
            lineHeight: 16,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.7,
          }}
        >
          {ro.home.legend}
        </Body>
        <View style={{ gap: 8 }}>
          {(["good", "medium", "low"] as const).map((grade) => (
            <View
              key={grade}
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <View
                style={{
                  minWidth: 76,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: colors[`${grade}Bg`],
                }}
              >
                <Body
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    textAlign: "center",
                    fontWeight: "800",
                    color: colors[grade],
                  }}
                >
                  {grade === "good"
                    ? ro.home.legendGood
                    : grade === "medium"
                      ? ro.home.legendMedium
                      : ro.home.legendLow}
                </Body>
              </View>
              <Body style={{ fontWeight: "600", flex: 1 }}>
                {ro.home[grade]}
              </Body>
            </View>
          ))}
        </View>
        <Body style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>
          {ro.app.design.legendNote}
        </Body>
      </Card>
      <DemoStatesSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}
