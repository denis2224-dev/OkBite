import { useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Body, Button, Icon } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
import { useTheme } from "../../core/theme/app_theme";
import { ResultView, LabelSheet } from "./widgets/result_view";
import { LoadingSkeleton } from "../../shared/widgets/loading_skeleton";
import { useProduct } from "./result_controller";
import { previewEntries } from "../../data/mock/mock_products";
import { useToast } from "../../shared/widgets/toast";
export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data, loading, error, storageError } = useProduct(id),
    [label, setLabel] = useState(false),
    { colors } = useTheme(),
    toast = useToast();
  const peer =
    data &&
    previewEntries.find(
      (e) =>
        e.product.category.slug === data.product.category.slug &&
        e.product.id !== id,
    );
  return (
    <Screen
      title={ro.result.title}
      back
      right={
        data ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ro.result.original}
            onPress={() => setLabel(true)}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="document" size={20} color={colors.ink} />
          </Pressable>
        ) : undefined
      }
      footer={
        data ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              style={{ flex: 1.5 }}
              onPress={() => router.push(`/preview?step=ingredients&id=${id}`)}
            >
              {ro.result.ingredients}
            </Button>
            {data.score.score !== null && (
              <Button
                variant="soft"
                icon="compare"
                style={{ flex: 1 }}
                onPress={() =>
                  peer
                    ? router.push(
                        `/compare-detail?a=${id}&b=${peer.product.id}`,
                      )
                    : toast(ro.app.design.noPeer)
                }
              >
                {ro.nav.compare}
              </Button>
            )}
          </View>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {storageError && (
            <Body accessibilityLiveRegion="polite">
              {ro.history.storageError}
            </Body>
          )}
          <ResultView {...data} onLabel={() => setLabel(true)} />
          <LabelSheet
            product={data.product}
            visible={label}
            onClose={() => setLabel(false)}
          />
        </>
      ) : (
        <>
          <Body accessibilityLiveRegion="polite">
            {error?.message ?? ro.errors.generic}
          </Body>
          <Button onPress={() => router.replace("/history")}>
            {ro.offline.history}
          </Button>
        </>
      )}
    </Screen>
  );
}
