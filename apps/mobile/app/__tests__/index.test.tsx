import { renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent } from '@testing-library/react-native';
import * as installPrompt from '../../src/lib/installPrompt';
import { ro } from '../../src/copy/ro';
import Home from '../(tabs)/index';

it('shows the photo button and the scan link on the home route', async () => {
  await renderRouter({ index: Home });
  expect(await screen.findByRole('button', { name: 'Fotografiază produsul' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Scanează codul de bare' })).toBeTruthy();
});

it('offers installation from Home only through the explicit install button', async () => {
  const install = jest.fn(async () => true);
  const hook = jest.spyOn(installPrompt, 'useInstallPrompt').mockReturnValue({ canInstall: true, isIos: false, isStandalone: false, install });
  try {
    await renderRouter({ index: Home });
    expect(install).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.pwa.install.title }));
    expect(install).toHaveBeenCalledTimes(1);
  } finally { hook.mockRestore(); }
});
