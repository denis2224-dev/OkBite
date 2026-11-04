import { routes } from "../../core/router/routes";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Body, Button } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
import { ResultView } from "./widgets/result_view";
import { LoadingSkeleton } from "../../shared/widgets/loading_skeleton";
import { useProduct } from "./result_controller";
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
          <Button onPress={() => router.replace(routes.history)}>
            {ro.offline.history}
          </Button>
        </>
      )}
    </Screen>
  );
}
