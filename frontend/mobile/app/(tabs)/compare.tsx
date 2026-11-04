import { Screen, Heading, Body, Card, Icon } from "../../src/ui";
import { ro } from "../../src/copy/ro";
import { isPreview } from "../../src/lib/preview";
import { ComparePreview } from "../../src/features/preview/ComparePreview";
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
