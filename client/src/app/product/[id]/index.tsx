import { useLocalSearchParams, router } from "expo-router";
import { Screen, Body, Button } from "../../../components";
import { ro } from "../../../copy/ro";
import { ResultView } from "../../../features/product/ResultView";
import { LoadingSkeleton } from "../../../components/LoadingSkeleton";
import { useProduct } from "../../../hooks/useProduct";
export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, storageError } = useProduct(id);
  return (
    <Screen title={ro.result.title} back>
      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {storageError && (
            <Body accessibilityLiveRegion="polite">
              {ro.history.storageError}
            </Body>
          )}
          <ResultView {...data} />
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
