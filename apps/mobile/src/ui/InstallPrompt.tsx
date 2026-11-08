import { useState } from 'react';
import { ro } from '../copy/ro';
import { useInstallDismissal, useInstallPrompt } from '../lib/installPrompt';
import { Card } from './Card';
import { Body, Heading } from './Typography';
import { Button } from './Button';

export function InstallPrompt() {
  const { canInstall, isIos, isStandalone, install } = useInstallPrompt();
  const [dismissed, dismiss] = useInstallDismissal();
  const [failed, setFailed] = useState(false);
  if (dismissed || isStandalone || (!canInstall && !isIos && !failed)) return null;
  return <Card>
    <Heading style={{ fontSize: 20 }}>{ro.pwa.install.title}</Heading>
    <Body>{ro.pwa.install.description}</Body>
    {isIos && <Body>{ro.pwa.install.iosHint}</Body>}
    {failed && <Body accessibilityRole="alert">{ro.pwa.install.failed}</Body>}
    {canInstall && <Button onPress={async () => { setFailed((await install()) === null); }}>{ro.pwa.install.title}</Button>}
    <Button variant="ghost" onPress={dismiss}>{ro.app.close}</Button>
  </Card>;
}
