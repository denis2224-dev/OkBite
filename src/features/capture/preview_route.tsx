import { useLocalSearchParams, Redirect } from "expo-router";
import { WorkflowPreview } from "./capture_screen";
import { DetailsPreview } from "../ingredients/ingredients_screen";
import { Screen } from "../../shared/widgets/state_screen";
import { isPreview } from "../../shared/state/app_state";
import { ro } from "../../core/constants/strings_ro";
import type { Step } from "./capture_controller";
export default function Preview() {
  const { step, id, code, forId } = useLocalSearchParams<{
    step: string;
    id: string;
    code: string;
    forId: string;
  }>();
  if (!isPreview) return <Redirect href="/" />;
  return step === "ingredients" || step === "label" ? (
    <Screen
      back
      title={
        step === "ingredients" ? ro.ingredients.title : ro.app.design.labelTitle
      }
    >
      <DetailsPreview kind={step} id={id} />
    </Screen>
  ) : (
    <WorkflowPreview
      key={`${step}:${id ?? ""}:${forId ?? ""}`}
      initial={
        ([
          "scan",
          "confirm",
          "notFound",
          "nutritionPhoto",
          "review",
          "offline",
        ].includes(step)
          ? step
          : "ingredientsPhoto") as Step
      }
      initialCode={code ?? ""}
      initialId={id}
      forId={forId}
    />
  );
}
