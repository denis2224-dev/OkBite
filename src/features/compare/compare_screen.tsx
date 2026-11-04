import { Screen, Heading, Body, Card, Icon } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
import { isPreview } from "../../shared/state/app_state";
import { ComparePreview } from "./widgets/compare_preview";
export default function Compare() {
  return (
    <Screen title={ro.compare.title}>
      {isPreview ? (
        <ComparePreview />
      ) : (
        <Card>
          <Icon name="compare" size={36} />
          <Heading>{ro.compare.choose}</Heading>
          <Body>{ro.compare.otherCategory}</Body>
          <Body>{ro.compare.pending}</Body>
        </Card>
      )}
    </Screen>
  );
}
