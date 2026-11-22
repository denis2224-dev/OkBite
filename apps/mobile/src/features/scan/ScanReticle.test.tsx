import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScanReticle } from './ScanReticle';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';

it('draws four mist corner guides and a green scan line, no text, without blocking touches', async () => {
  await render(<ScanReticle />);
  const reticle = screen.getByTestId('scan-reticle');
  expect(reticle.props.pointerEvents).toBe('none');
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    expect(StyleSheet.flatten(screen.getByTestId(`scan-reticle-${corner}`).props.style).borderColor).toBe(light.mist);
  }
  expect(StyleSheet.flatten(screen.getByTestId('scan-line').props.style).backgroundColor).toBe(light.greenLight);
  expect(screen.queryByText(ro.scan.frameHint)).toBeNull();
});
