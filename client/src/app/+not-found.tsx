import { router } from "expo-router";
import { Screen, Card, Heading, Body, Button } from "../components";
import { ro } from "../copy/ro";
export default function MissingRoute() {
  return (
    <Screen back>
      <Card>
        <Heading>{ro.app.integrationTitle}</Heading>
        <Body>{ro.home.workflowPending}</Body>
        <Button onPress={() => router.replace("/")}>{ro.nav.home}</Button>
      </Card>
    </Screen>
  );
}
