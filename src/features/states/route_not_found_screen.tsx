import { routes } from "../../core/router/routes";
import { router } from "expo-router";
import { Screen, Card, Heading, Body, Button } from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
export default function MissingRoute() {
  return (
    <Screen back>
      <Card>
        <Heading>{ro.app.integrationTitle}</Heading>
        <Body>{ro.home.workflowPending}</Body>
        <Button onPress={() => router.replace(routes.home)}>
          {ro.nav.home}
        </Button>
      </Card>
    </Screen>
  );
}
