import { useLocalSearchParams, Redirect } from "expo-router";
import { WorkflowPreview } from "../features/preview/WorkflowPreview";
import { DetailsPreview } from "../features/preview/DetailsPreview";
import { Screen } from "../components/Screen";
import { isPreview } from "../config/preview";
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
