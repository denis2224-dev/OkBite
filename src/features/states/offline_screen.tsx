import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Body,
  Heading,
  Card,
  Icon,
  Button,
} from "../../shared/widgets";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
import { getDemoState, resolveDemoCode } from "../../shared/state/app_state";
import { useToast } from "../../shared/widgets/toast";
export function OfflineContent({
  code,
  onReconnect,
}: {
  code: string;
  onReconnect: () => void;
}) {
  const { colors } = useTheme(),
    d = ro.app.design;
  return (
    <>
      <View
        style={{
          alignItems: "center",
          gap: 16,
          paddingTop: 32,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="offline" size={36} color="#3F4842" />
        </View>
        <Heading style={{ fontSize: 24, lineHeight: 32, textAlign: "center" }}>
          {d.offlineTitle}
        </Heading>
        <Body style={{ textAlign: "center", color: colors.muted }}>
          Codul <Body style={{ fontWeight: "800" }}>{code}</Body> a fost
          păstrat. Îl căutăm imediat ce revine internetul.
        </Body>
      </View>
      <Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Icon name="history" size={20} color="#2E6B45" />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: "800" }}>{d.historyOffline}</Body>
            <Body style={{ color: colors.muted }}>{d.historyOfflineHint}</Body>
          </View>
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        onPress={onReconnect}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Body
          style={{
            color: colors.forest,
            fontWeight: "800",
            textDecorationLine: "underline",
            textAlign: "center",
          }}
        >
          {d.reconnect}
        </Body>
      </Pressable>
    </>
  );
}
export default function Offline() {
  const toast = useToast(),
    code = getDemoState().lastCode;
  return (
    <Screen
      title={ro.offline.title}
      back
      footer={
        <>
          <Button
            icon="retry"
            onPress={() => toast(ro.app.design.stillOffline)}
          >
            {ro.app.retry}
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.replace("/history")}
          >
            {ro.offline.history}
          </Button>
        </>
      }
    >
      <OfflineContent
        code={code}
        onReconnect={() => {
          const found = resolveDemoCode(code, true);
          toast(ro.app.design.reconnected);
          router.replace(
            `/preview?step=${found.screen}&code=${code}&id=${found.entry?.product.id ?? ""}`,
          );
        }}
      />
    </Screen>
  );
}
