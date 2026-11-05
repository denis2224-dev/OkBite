import type { PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { Body, Button, Card, Heading, Screen } from '../../ui';
import { ro } from '../../copy/ro';
import { texts, type LegalKind } from './texts';

export function LegalScreen({ kind, children }: PropsWithChildren<{ kind: LegalKind }>) {
  const text = texts[kind];
  return (
    <Screen title={text.title} back>
      <Heading>{text.lead}</Heading>
      <Body>{ro.legal.updated}</Body>
      <Card><Body>{ro.legal.draft}</Body></Card>
      {text.sections.map(section => (
        <Card key={section.title}>
          <Heading style={{ fontSize: 20, lineHeight: 27 }}>{section.title}</Heading>
          <Body>{section.body}</Body>
        </Card>
      ))}
      {kind === 'method' ? <Body>{ro.score.disclaimer}</Body> : null}
      {kind === 'privacy' ? <Body>{ro.legal.contactPending}</Body> : null}
      {kind === 'about' ? <>
        <Button variant="secondary" onPress={() => router.push('/method')}>{ro.nav.method}</Button>
        <Button variant="secondary" onPress={() => router.push('/privacy')}>{ro.nav.privacy}</Button>
        <Button variant="secondary" onPress={() => router.push('/terms')}>{ro.nav.terms}</Button>
      </> : null}
      {children}
    </Screen>
  );
}
