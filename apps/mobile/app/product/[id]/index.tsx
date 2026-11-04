import { useLocalSearchParams, router } from "expo-router";
import { Screen, Body, Button } from "../../../src/ui";
import { ro } from "../../../src/copy/ro";
import { ResultView } from "../../../src/features/product/ResultView";
import { LoadingSkeleton } from "../../../src/ui/LoadingSkeleton";
import { useProduct } from "../../../src/features/product/useProduct";
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
