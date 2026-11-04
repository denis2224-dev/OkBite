import { Screen, Heading, Body, Card, Icon } from "../../components";
import { ro } from "../../copy/ro";
import { isPreview } from "../../config/preview";
import { ComparePreview } from "../../features/preview/ComparePreview";
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
