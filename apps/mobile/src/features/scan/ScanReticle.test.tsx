import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScanReticle } from './ScanReticle';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';

it('draws four corner guides and a readable hint without blocking touches', async () => {
  await render(<ScanReticle />);
  const reticle = screen.getByTestId('scan-reticle');
  expect(reticle.props.pointerEvents).toBe('none');
  for (const corner of ['tl', 'tr', 'bl', 'br']) expect(screen.getByTestId(`scan-reticle-${corner}`)).toBeTruthy();
  const hint = screen.getByText(ro.scan.frameHint);
  expect(StyleSheet.flatten(hint.props.style).color).toBe(light.cameraInk);
  expect(StyleSheet.flatten(screen.getByTestId('scan-reticle-hint').props.style).backgroundColor).toBe(light.cameraOverlay);
});
