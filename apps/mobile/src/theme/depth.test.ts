import { depth } from './depth';
import { light } from './tokens';

const layers = (shadow: string) => shadow.split(/,(?![^(]*\))/).map(layer => layer.trim());

describe('soft depth', () => {
  it.each(['raised', 'raisedSmall'] as const)('%s lifts with a dark shade bottom-right and a light lift top-left', key => {
    const [shade, lift] = layers(depth[key].boxShadow);
    expect(shade).toMatch(/^\d+px \d+px/);
    expect(lift).toMatch(/^-\d+px -\d+px .*255,255,255/);
  });
  it.each(['pressed', 'well'] as const)('%s is pushed in (every layer inset)', key => {
    for (const layer of layers(depth[key].boxShadow)) expect(layer.startsWith('inset')).toBe(true);
  });
  it('fills pressed chips and the current tab with cream', () => {
    expect(depth.pressed.backgroundColor).toBe(light.cream);
  });
  it('keeps a solid forest fallback under the forest gradient', () => {
    expect(depth.forest.backgroundColor).toBe(light.primary);
    expect(depth.forest.experimental_backgroundImage).toContain(light.primaryLight);
    expect(depth.forestPressed.boxShadow.startsWith('inset')).toBe(true);
  });
});
