import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ScoreReason } from '@okbite/shared';
import { InShort } from './InShort';
import { WhatsInside } from './WhatsInside';
import { IngredientsLabel } from './IngredientsLabel';
import { insideRows, reasonFor } from './insideRows';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';

const reason = (tone: ScoreReason['tone'], title: string, detail = 'detaliu'): ScoreReason => ({ tone, title, detail });
const withNutrients = (nutrients: Partial<typeof foundYogurt.product.nutrients>) =>
  ({ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, ...nutrients } });

describe('InShort', () => {
  it('shows the verdict for the tier and at most three reasons, problems first', async () => {
    const reasons = [reason('good', 'Bogat în proteine'), reason('bad', 'Mult zahăr'), reason('neutral', 'Sare: nivel mediu'), reason('bad', 'Multă sare')];
    await render(<InShort tier="poor" reasons={reasons} sugar={null} />);
    expect(screen.getByRole('header', { name: ro.result.inShort })).toBeTruthy();
    expect(screen.getByText(ro.result.verdict.poor)).toBeTruthy();
    const shown = screen.getAllByText(/Mult zahăr|Multă sare|Sare: nivel mediu|Bogat în proteine/).map(node => node.props.children);
    expect(shown).toEqual(['Mult zahăr', 'Multă sare', 'Sare: nivel mediu']);
  });
  it.each(['excellent', 'good', 'fair', 'poor', 'bad'] as const)('has a verdict line for the %s tier', async tier => {
    await render(<InShort tier={tier} reasons={[]} sugar={null} />);
    expect(screen.getByText(ro.result.verdict[tier])).toBeTruthy();
  });
  it('uses a check for good tiers and an alert triangle otherwise, both from the Icon set', async () => {
    const view = await render(<InShort tier="excellent" reasons={[]} sugar={null} />);
    const paths = (v: typeof view) => JSON.stringify(v.toJSON());
    const good = paths(view);
    await view.unmount();
    const bad = paths(await render(<InShort tier="poor" reasons={[]} sugar={null} />));
    expect(good).not.toEqual(bad.replace(ro.result.verdict.poor, ro.result.verdict.excellent));
  });
  it('draws no bullet or middle dot', async () => {
    await render(<InShort tier="poor" reasons={[reason('bad', 'Mult zahăr', '28 g la 100 ml')]} sugar={28} />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/[•·]/);
  });
});

describe('insideRows', () => {
  it('has one row per declared nutrient, in contract order, and bars only where a daily reference exists', () => {
    const rows = insideRows(foundYogurt.product, foundYogurt.score);
    expect(rows.map(row => row.key)).toEqual(['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber']);
    expect(rows.filter(row => row.percent !== null).map(row => row.key)).toEqual(['kcal', 'sat', 'sugar', 'salt']);
    expect(rows.find(row => row.key === 'sugar')!.percent).toBe(Math.round(16.4 / 90 * 100)); // 4,1 g per 100 g, for the 400 g pack
  });
  it('works the values out for the whole package, not per 100 g', () => {
    const rows = Object.fromEntries(insideRows(foundYogurt.product, foundYogurt.score).map(row => [row.key, row.value]));
    expect(foundYogurt.product.quantity).toBe('400 g');
    expect(rows).toMatchObject({ kcal: 252, fat: 10, sat: 6.4, sugar: 16.4, salt: 0.4, protein: 14.4, fiber: 0 });
  });
  it('keeps the share of fruit and vegetables as it is, and uses another weight when the pack differs', () => {
    const rows = Object.fromEntries(insideRows({ ...foundYogurt.product, quantity: '250 g', nutrients: { ...foundYogurt.product.nutrients, fruitVegPct: 40 } }, foundYogurt.score).map(row => [row.key, row.value]));
    expect(rows.fruitVegPct).toBe(40);
    expect(rows.kcal).toBe(157.5);
  });
  it('falls back to per 100 g when the weight cannot be read', () => {
    const rows = Object.fromEntries(insideRows({ ...foundYogurt.product, quantity: 'o bucată' }, foundYogurt.score).map(row => [row.key, row.value]));
    expect(rows.kcal).toBe(63);
  });
  it('matches a score reason to its nutrient by the reason title', () => {
    const reasons = [reason('bad', 'Mult zahăr'), reason('good', 'Bogat în proteine'), reason('neutral', 'Grăsimi saturate: nivel mediu')];
    expect(reasonFor(reasons, 'sugar')?.title).toBe('Mult zahăr');
    expect(reasonFor(reasons, 'protein')?.title).toBe('Bogat în proteine');
    expect(reasonFor(reasons, 'sat')?.title).toBe('Grăsimi saturate: nivel mediu');
    expect(reasonFor(reasons, 'salt')).toBeNull();
  });
});

describe('WhatsInside', () => {
  it('lists the nutrients with a thin bar and a caption, and nothing invented', async () => {
    await render(<WhatsInside product={foundYogurt.product} score={foundYogurt.score} />);
    expect(screen.getByRole('header', { name: ro.result.whatsInside })).toBeTruthy();
    const card = screen.getByTestId('whats-inside');
    for (const key of ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber'] as const) expect(within(card).getByText(ro.result.nutrients[key])).toBeTruthy();
    expect(within(card).queryByText(ro.result.nutrients.fruitVegPct)).toBeNull(); // not declared
    expect(screen.getByTestId('inside-bar-sugar')).toBeTruthy();
    expect(screen.queryByTestId('inside-bar-protein')).toBeNull(); // no daily reference, so no bar
    expect(screen.queryByTestId('whats-inside-basis')).toBeNull(); // the weight is known, so no per 100 g note
    expect(within(card).getByText('252 kcal')).toBeTruthy(); // 63 kcal per 100 g, for the 400 g pack
    expect(within(card).getByText('Grăsimi saturate: nivel mediu')).toBeTruthy(); // the score's own level text
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/[•·]/);
  });
  it('fills a bar red when the score flags that nutrient, and caps it at the full width', async () => {
    const product = withNutrients({ sugar: 120 });
    await render(<WhatsInside product={product} score={{ ...foundYogurt.score, reasons: [reason('bad', 'Mult zahăr')] }} />);
    expect(StyleSheet.flatten(screen.getByTestId('inside-fill-sugar').props.style)).toMatchObject({ width: '100%', backgroundColor: light.low, height: 6 });
  });
  it('shows a value only, with no bar and no caption, for a nutrient without a reference or reason', async () => {
    await render(<WhatsInside product={withNutrients({ protein: 3.6 })} score={{ ...foundYogurt.score, reasons: [] }} />);
    const row = screen.getByLabelText(new RegExp(`^${ro.result.nutrients.protein}, `));
    expect(row.props.accessibilityLabel).not.toContain('%');
    expect(screen.queryByTestId('inside-bar-protein')).toBeNull();
  });
  it('says per 100 g only when the weight cannot be read', async () => {
    await render(<WhatsInside product={{ ...foundYogurt.product, quantity: 'o bucată' }} score={foundYogurt.score} />);
    expect(screen.getByTestId('whats-inside-basis')).toHaveTextContent(ro.result.per100('g'));
    expect(screen.getByText('63 kcal')).toBeTruthy();
  });
  it('renders nothing when no nutrient is declared', async () => {
    const empty = withNutrients({ kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null });
    await render(<WhatsInside product={empty} score={foundYogurt.score} />);
    expect(screen.toJSON()).toBeNull();
  });
});

describe('IngredientsLabel', () => {
  const product = { ...foundYogurt.product, ingredientsText: 'lapte, zahăr, arome.' };
  it('shows the label text as one block of running text, with no "Ingrediente:" in front of it; the heading stays', async () => {
    await render(<IngredientsLabel product={product} />);
    const box = screen.getByTestId('ingredients-text');
    expect(within(box).getByText('lapte, zahăr, arome.')).toBeTruthy(); // the text starts the box
    expect(within(box).queryByText(/Ingrediente:|Ingredients:|Состав:/, { exact: false })).toBeNull();
    expect(screen.getByText(ro.result.ingredientsTitle)).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/[•·]/);
  });
  it('opens and closes with a chevron button and announces the expanded state', async () => {
    await render(<IngredientsLabel product={product} />);
    const button = screen.getByRole('button', { name: ro.result.ingredientsHide });
    expect(button.props.accessibilityState.expanded).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('ingredients-chevron').props.style).transform).toEqual([{ rotate: '180deg' }]);
    await fireEvent.press(button);
    expect(screen.queryByTestId('ingredients-text')).toBeNull();
    const closed = screen.getByRole('button', { name: ro.result.ingredientsShow });
    expect(closed.props.accessibilityState.expanded).toBe(false);
    expect(StyleSheet.flatten(screen.getByTestId('ingredients-chevron').props.style).transform).toEqual([{ rotate: '0deg' }]);
    await fireEvent.press(closed);
    expect(screen.getByTestId('ingredients-text')).toBeTruthy();
  });
  it('renders nothing without ingredient text', async () => {
    await render(<IngredientsLabel product={{ ...product, ingredientsText: '  ' }} />);
    expect(screen.toJSON()).toBeNull();
  });
});
