import { router } from "expo-router";
import { Screen, Body, Heading, Card, Icon, Button } from "../components";
import { ro } from "../copy/ro";
export default function Offline() {
  return (
    <Screen back>
      <Card>
        <Icon name="offline" size={40} />
        <Heading>{ro.offline.title}</Heading>
        <Body>{ro.offline.description}</Body>
        <Button onPress={() => router.push("/history")}>
          {ro.offline.history}
        </Button>
      </Card>
    </Screen>
  );
}
