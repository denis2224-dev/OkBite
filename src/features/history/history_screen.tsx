import { useCallback, useState } from "react";
import { View, Modal, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
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
import { ro, plural } from "../../core/constants/strings_ro";
import {
  isPreview,
  useDemoState,
  demoActions,
} from "../../shared/state/app_state";
import {
  listHistory,
  clearHistory,
  removeFromHistory,
  type HistoryEntry,
} from "../../data/repositories/history_repository";
import { useToast } from "../../shared/widgets/toast";
export default function History() {
  const { colors } = useTheme(),
    demo = useDemoState(),
    toast = useToast();
  const [rows, setRows] = useState<HistoryEntry[]>([]),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(() => {
    if (!isPreview)
      void listHistory()
        .then(setRows)
        .catch(() => setError(ro.history.storageError));
  }, []);
  useFocusEffect(load);
  const entries = isPreview ? demo.history : rows;
  async function clear() {
    try {
      if (isPreview) demoActions.clearHistory();
      await clearHistory();
      setRows([]);
      setConfirm(false);
      toast(ro.history.cleared);
    } catch {
      setError(ro.history.storageError);
    }
  }
  async function remove(id: string) {
    try {
      if (isPreview) demoActions.removeHistory(id);
      await removeFromHistory(id);
      setRows((current) => current.filter((row) => row.product.id !== id));
      toast(ro.app.design.deleted);
    } catch {
      setError(ro.history.storageError);
    }
  }
  const header = (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Heading style={{ fontSize: 21 }}>{ro.history.title}</Heading>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ro.history.clear}
        onPress={() => setConfirm(true)}
        style={{
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 22,
          backgroundColor: colors.lowBg,
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
        }}
      >
        <Icon name="trash" size={16} color={colors.low} />
        <Body style={{ fontSize: 12, fontWeight: "800", color: colors.low }}>
          {ro.history.clear}
        </Body>
      </Pressable>
    </View>
  );
  return (
    <Screen header={header}>
      <Body style={{ fontSize: 13, color: colors.muted }}>
        {ro.history.description}
      </Body>
      {!!error && <Body accessibilityLiveRegion="polite">{error}</Body>}
      {entries.length ? (
        <HistoryRows
          entries={entries}
          onOpen={({ product }) => router.push(`/product/${product.id}`)}
          onRemove={(id) => void remove(id)}
        />
      ) : (
        <Card style={{ paddingVertical: 30, alignItems: "center" }}>
          <Icon name="history" size={42} color={colors.muted} />
          <Heading style={{ fontSize: 22, textAlign: "center" }}>
            {ro.history.emptyTitle}
          </Heading>
          <Body style={{ color: colors.muted, textAlign: "center" }}>
            {ro.history.empty}
          </Body>
          <Button icon="scan" onPress={() => router.push("/preview?step=scan")}>
            {ro.app.design.primaryScan.replace("produsul", "un produs")}
          </Button>
        </Card>
      )}
      <Modal
        visible={confirm}
        transparent
        animationType="none"
        onRequestClose={() => setConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.scrim,
            justifyContent: "flex-end",
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 390,
              alignSelf: "center",
              backgroundColor: colors.ground,
              padding: 20,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              gap: 14,
            }}
          >
            <Heading style={{ fontSize: 21 }}>{ro.history.clearTitle}</Heading>
            <Body>
              {ro.app.design.clearPrefix}
              {plural(entries.length, "produs", "produse")}
              {ro.app.design.clearSuffix}
            </Body>
            <Button onPress={() => void clear()}>{ro.history.clear}</Button>
            <Button variant="secondary" onPress={() => setConfirm(false)}>
              {ro.app.cancel}
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
