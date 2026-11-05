import { Screen } from "../../shared/widgets";
import { LegalContent } from "./legal_content";
export default function Page() {
  return (
    <Screen back>
      <LegalContent kind="privacy" />
    </Screen>
  );
}
