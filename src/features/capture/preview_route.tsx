import { useLocalSearchParams, Redirect } from "expo-router";
import { WorkflowPreview } from "./capture_screen";
import { DetailsPreview } from "../ingredients/ingredients_screen";
import { Screen } from "../../shared/widgets/state_screen";
import { isPreview } from "../../shared/state/app_state";
export default function Preview() {
  const { step, id } = useLocalSearchParams<{ step: string; id: string }>();
  if (!isPreview) return <Redirect href="/" />;
  return step === "ingredients" || step === "label" ? (
    <Screen back>
      <DetailsPreview kind={step} id={id} />
    </Screen>
  ) : (
    <WorkflowPreview initial={step === "scan" ? "scan" : "capture"} />
  );
}
