import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { light, radii } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { ro } from '../../copy/ro';
import { previewEntries } from '../../test/fixtures';
import { listHistory } from '../history/store';
import { ScanModeSwitch } from './ScanModeSwitch';
import { ScanHeader } from './ScanHeader';
import { ManualCode } from './ManualCode';
import { ScanReticle } from './ScanReticle';
import { RecentScans } from './RecentScans';
import { StatusPanel } from '../capture/StatusPanel';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('../history/store', () => ({ listHistory: jest.fn() }));
jest.mock('../shelf/ShelfPicks', () => ({ ShelfPicks: () => null }));
jest.mock('../profile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: [], avoid: [], onboarded: true } }) }));

type Node = { props: { style?: unknown; testID?: string }; children?: unknown };
const style = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
const depthShadows = new Set<unknown>(Object.values(depth).map(level => level.boxShadow));
/** Every shadow on screen must come from `theme/depth`; legacy shadows, elevation and text glows fail. Returns the depth levels used. */
function depthUsed() {
  const used: unknown[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const flat = style(node as Node);
    if (flat) {
      expect(flat.shadowOpacity ?? 0).toBe(0);
      expect(flat.elevation ?? 0).toBe(0);
      expect(flat.textShadowRadius ?? 0).toBe(0);
      if (flat.boxShadow) { expect(depthShadows.has(flat.boxShadow)).toBe(true); used.push(flat.boxShadow); }
    }
    walk((node as Node).children);
  };
  walk(screen.toJSON());
  return used;
}

describe('Moss soft-depth scan styling', () => {
  it('draws the mode switch (on the dark camera panel) as a raised ivory track with a forest selected segment and white label', async () => {
    await render(<ScanModeSwitch onLabel={jest.fn()} />);
    const selected = screen.getByRole('button', { name: ro.scan.manualLabel });
    const other = screen.getByRole('button', { name: ro.scan.photoLabel });
    expect(style(screen.getByTestId('scan-mode-track'))).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.pill, ...depth.raisedOnDark });
    expect(style(selected)).toMatchObject({ borderRadius: radii.pill, ...depth.forestOnDark });
    expect(style(other).backgroundColor ?? light.transparent).toBe(light.transparent);
    expect(style(other).boxShadow).toBeUndefined();
    expect(style(screen.getByText(ro.scan.manualLabel)).color).toBe(light.onPrimary);
    expect(style(screen.getByText(ro.scan.labelMode)).color).toBe(light.muted);
    expect(depthUsed()).toEqual([depth.raisedOnDark.boxShadow, depth.forestOnDark.boxShadow]);
  });

  it('uses the shared on-dark IconButton for flash and fills the bolt while the torch is on', async () => {
    const view = await render(<ScanHeader torch={false} onTorch={jest.fn()} />);
    // The header sits on the dark camera panel: the sage tile drops its white lift (no halo).
    expect(style(screen.getByTestId('icon-button-face'))).toMatchObject(depth.sageTileOnDark);
    expect(String(style(screen.getByTestId('icon-button-face')).boxShadow)).not.toContain('255,255,255,0.95');
    expect(screen.getByRole('button', { name: ro.scan.flashOn })).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain(`"fill":"${light.primary}"`);
    await view.rerender(<ScanHeader torch onTorch={jest.fn()} />);
    expect(screen.getByRole('button', { name: ro.scan.flashOff })).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain(`"fill":"${light.primary}"`);
    depthUsed();
  });

  it('draws the manual-code row as a raised pill and the input as an inset well with a forest focus ring', async () => {
    await render(<ManualCode open onToggle={jest.fn()} onSubmit={jest.fn()} onDark />);
    expect(style(screen.getByRole('button', { name: ro.scan.manual }))).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.pill, ...depth.raisedOnDark });
    expect(style(screen.getByRole('button', { name: ro.scan.search }))).toMatchObject(depth.forestOnDark);
    const input = screen.getByLabelText(ro.scan.manualTitle);
    expect(style(input)).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.small, borderWidth: 2, borderColor: light.transparent, ...depth.well });
    await act(() => fireEvent(input, 'focus'));
    // Same border width focused or not, so the text does not move; the border is the ring, not the browser's own outline.
    expect(style(screen.getByLabelText(ro.scan.manualTitle))).toMatchObject({ borderColor: light.focus, borderWidth: 2, outlineStyle: 'solid', outlineWidth: 0 });
    await act(() => fireEvent(screen.getByLabelText(ro.scan.manualTitle), 'blur'));
    expect(style(screen.getByLabelText(ro.scan.manualTitle)).borderColor).toBe(light.transparent);
    depthUsed();
  });

  it('keeps the light-page depth for the manual-code row and search button off the camera panel', async () => {
    await render(<ManualCode open onToggle={jest.fn()} onSubmit={jest.fn()} />);
    expect(style(screen.getByRole('button', { name: ro.scan.manual }))).toMatchObject(depth.raisedSmall);
    expect(style(screen.getByRole('button', { name: ro.scan.search }))).toMatchObject(depth.forest);
  });

  it('draws no white lift (a halo on dark) around raised things on the camera panel', async () => {
    await render(<><ScanModeSwitch onLabel={jest.fn()} /><ManualCode open onToggle={jest.fn()} onSubmit={jest.fn()} onDark /></>);
    const raisedOutside = depthUsed().filter(shadow => !String(shadow).startsWith('inset')); // the input's inset well sits on ivory
    expect(raisedOutside.length).toBeGreaterThan(0);
    for (const shadow of raisedOutside) expect(String(shadow)).not.toContain('255,255,255,0.95');
  });

  it('draws reticle corners in sage with no glow', async () => {
    await render(<ScanReticle />);
    expect(style(screen.getByTestId('scan-reticle-tl')).borderColor).toBe(light.sage);
    expect(depthUsed()).toEqual([]);
  });

  it('raises the recent-scans sheet and gives each row a raised forest score tile', async () => {
    jest.mocked(listHistory).mockResolvedValue(previewEntries.slice(0, 3).map((entry, index) => ({ ...entry, savedAt: `2026-11-0${9 - index}T09:00:00.000Z` })));
    await render(<RecentScans active />);
    await screen.findByText(previewEntries[0]!.product.name);
    expect(style(screen.getByTestId('recent-scans-sheet'))).toMatchObject({ backgroundColor: light.surface, borderTopLeftRadius: radii.hero, ...depth.raisedOnDark }); // its top edge sits on the dark camera panel
    const tiles = screen.getAllByTestId('recent-scan-tile');
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) expect(style(tile)).toMatchObject({ borderRadius: radii.small, ...depth.forest });
    for (const letter of screen.getAllByTestId('recent-scan-letter')) expect(style(letter).color).toBe(light.onPrimary);
    depthUsed();
  });

  it('draws the status panel as the shared raised card with forest primary and ivory secondary', async () => {
    await render(<StatusPanel message="m" actions={[{ label: 'Unu', onPress: jest.fn() }, { label: 'Doi', onPress: jest.fn() }]} />);
    expect(style(screen.getByTestId('status-panel'))).toMatchObject({ backgroundColor: light.surface, ...depth.raised });
    expect(style(screen.getByRole('button', { name: 'Unu' }))).toMatchObject(depth.forest);
    expect(style(screen.getByRole('button', { name: 'Doi' }))).toMatchObject(depth.raisedSmall);
    depthUsed();
  });
});
