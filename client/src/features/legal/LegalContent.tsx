import { View, Linking } from "react-native";
import { Heading, Body, Card, Badge, Button } from "../../components";
import { texts, type LegalKind } from "./texts";
import { ro } from "../../copy/ro";
import { useTheme } from "../../hooks/useTheme";
export function LegalContent({ kind }: { kind: LegalKind }) {
  const { colors } = useTheme();
  return (
    <>
      <Heading style={{ fontSize: 32, lineHeight: 38 }}>{ro.nav[kind]}</Heading>
      <Body style={{ fontSize: 12, color: colors.muted }}>
        {ro.legal.updated}: 04.11.2026
      </Body>
      {(kind === "privacy" || kind === "terms") && (
        <>
          <Badge tone="unverified">{ro.legal.draft}</Badge>
          <Body style={{ fontSize: 13, color: colors.muted }}>
            {ro.legal.contactPending}
          </Body>
        </>
      )}
      {texts[kind].map((section) => (
        <Card key={section.title}>
          <Heading style={{ fontSize: 20, lineHeight: 26 }}>
            {section.title}
          </Heading>
          <Body>{section.body}</Body>
          {"url" in section && (
            <View>
              <Button
                variant="ghost"
                onPress={() => void Linking.openURL(section.url)}
              >
                {ro.legal.readSource}
              </Button>
            </View>
          )}
        </Card>
      ))}
    </>
  );
}
