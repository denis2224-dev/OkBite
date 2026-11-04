import { routes } from "../../core/router/routes";
import { router } from "expo-router";
import {
  Screen,
  Body,
  Heading,
  Card,
  Icon,
  Button,
} from "../../shared/widgets";
import { ro } from "../../core/constants/strings_ro";
export default function Offline() {
  return (
    <Screen back>
      <Card>
        <Icon name="offline" size={40} />
        <Heading>{ro.offline.title}</Heading>
        <Body>{ro.offline.description}</Body>
        <Button onPress={() => router.push(routes.history)}>
          {ro.offline.history}
        </Button>
      </Card>
    </Screen>
  );
}
