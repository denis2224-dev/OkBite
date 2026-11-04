import { Screen } from "../../components";
import { LegalContent } from "../../features/legal/LegalContent";
export default function Page() {
  return (
    <Screen back>
      <LegalContent kind="terms" />
    </Screen>
  );
}
