import { useLocalSearchParams, usePathname } from "expo-router";
import { Screen, Heading, Body, Card, Icon } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
import { isPreview } from "../../shared/state/app_state";
import { ComparePreview } from "./widgets/compare_preview";
export default function Compare() {
  const { a, b } = useLocalSearchParams<{ a: string; b: string }>(),
    detail = usePathname() === "/compare-detail";
  return (
    <Screen title={ro.compare.title} titleSize={detail ? 18 : 21} back={detail}>
      {isPreview ? (
        <>
          <ComparePreview initialA={a} initialB={b} />
        </>
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
