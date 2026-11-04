import { useCallback, useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen, Body, Heading, Card, Button, Icon } from "../../components";
import { useTheme } from "../../hooks/useTheme";
import { ro } from "../../copy/ro";
import {
  listHistory,
  clearHistory,
  type HistoryEntry,
} from "../../features/history/store";
export default function History() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<HistoryEntry[]>([]),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(() => {
    listHistory()
      .then(setRows)
      .catch(() => setError(ro.history.storageError));
  }, []);
  useFocusEffect(load);
  async function clear() {
    try {
      await clearHistory();
      setRows([]);
      setConfirm(false);
    } catch {
      setError(ro.history.storageError);
    }
  }
  return (
    <Screen title={ro.history.title}>
      <Body style={{ color: colors.muted }}>{ro.history.description}</Body>
      {!!error && <Body accessibilityLiveRegion="polite">{error}</Body>}
      {rows.length ? (
        <>
          <Body>{ro.history.count(rows.length)}</Body>
          {rows.map(({ product, score, savedAt }) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              accessibilityLabel={ro.history.open(product.name)}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <Card
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Icon name="tag" color={colors.primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Heading style={{ fontSize: 18, lineHeight: 23 }}>
                    {product.name}
                  </Heading>
                  <Body style={{ color: colors.muted, fontSize: 12 }}>
                    {product.brand}
                  </Body>
                  <Body style={{ color: colors.muted, fontSize: 11 }}>
                    {new Date(savedAt).toLocaleDateString("ro-RO")}
                  </Body>
                </View>
                <Body style={{ fontWeight: "700" }}>{score.score ?? "—"}</Body>
                <Icon name="arrow" size={18} color={colors.muted} />
              </Card>
            </Pressable>
          ))}
          <Button variant="ghost" icon="trash" onPress={() => setConfirm(true)}>
            {ro.history.clear}
          </Button>
        </>
      ) : (
        <Card style={{ paddingVertical: 36 }}>
          <Icon name="history" color={colors.primary} size={44} />
          <Heading>{ro.history.emptyTitle}</Heading>
          <Body style={{ color: colors.muted }}>{ro.history.empty}</Body>
          <Button icon="camera" onPress={() => router.replace("/")}>
            {ro.nav.home}
          </Button>
        </Card>
      )}
      <Modal
        transparent
        visible={confirm}
        onRequestClose={() => setConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: colors.scrim,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{ width: "100%", maxWidth: 430, alignSelf: "center" }}
          >
            <Card>
              <Heading>{ro.history.clearTitle}</Heading>
              <Body>{ro.history.clearBody}</Body>
              <Button onPress={clear}>{ro.history.clearConfirm}</Button>
              <Button variant="ghost" onPress={() => setConfirm(false)}>
                {ro.app.cancel}
              </Button>
            </Card>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
