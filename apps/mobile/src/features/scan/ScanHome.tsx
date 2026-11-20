import { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/useTheme';
import ScanScreen from './ScanScreen';
import { ScanControls } from './ScanControls';
import { closeUpSupported, torchSupported } from './torchSupport';

/** Scan tab: the camera fills the screen, with a light button and a close-up button. `active` mounts the camera only while the tab is focused. */
export function ScanHome({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const [torch, setTorch] = useState(false);
  const [closeUp, setCloseUp] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) { // Leaving the tab turns light and close-up off, so both are off again on return.
    setWasActive(active);
    if (!active) { setTorch(false); setCloseUp(false); }
  }
  return <View style={{ flex: 1, backgroundColor: colors.cameraBackground }}>
    {active ? <StatusBar style="light" /> : null}
    {active ? <ScanScreen embedded torch={torch} zoom={closeUp} /> : null}
    <ScanControls torch={torch} onTorch={torchSupported ? () => setTorch(on => !on) : undefined}
      closeUp={closeUp} onCloseUp={closeUpSupported ? () => setCloseUp(on => !on) : undefined} />
  </View>;
}
