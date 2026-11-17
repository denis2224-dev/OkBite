import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReadLabelResponse } from '@okbite/shared';
import { light, radii } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { GuidedAddProgress } from './GuidedAddProgress';
import { CategoryPicker } from './CategoryPicker';
import { UnknownConfirmationField } from './UnknownConfirmationField';
import { NutritionFields } from './NutritionFields';
import { ReviewForm } from './ReviewForm';
import { getAvailableCategories } from './draftStore';
import { parseAddParams } from '../identify/routes';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
const flat = (node: { props: Record<string, unknown> }) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
const hidden = { includeHiddenElements: true };
const field = { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: radii.small };
const empty = { kcal: '', fat: '', sat: '', sugar: '', salt: '', protein: '', fiber: '', fruitVegPct: '' };

it('draws progress steps on the palette: forest done, sage-soft to do', async () => {
  await render(<GuidedAddProgress step={2} total={4} />);
  expect(flat(screen.getByTestId('progress-step-0', hidden))).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill });
  expect(flat(screen.getByTestId('progress-step-1', hidden)).backgroundColor).toBe(light.primary);
  expect(flat(screen.getByTestId('progress-step-2', hidden)).backgroundColor).toBe(light.sageSoft);
});

it('draws category chips as flat pills: sage-soft, or forest with a white label when chosen', async () => {
  const [first, second] = getAvailableCategories();
  await render(<CategoryPicker categories={[first!, second!]} selectedSlug={first!.slug} onSelect={jest.fn()} />);
  const chips = screen.getAllByRole('button');
  expect(flat(chips[0]!)).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill });
  expect(flat(chips[1]!)).toMatchObject({ backgroundColor: light.sageSoft, borderRadius: radii.pill, borderWidth: 0 });
});

it('gives the confirmation field a surface fill, 1 px border and a forest ring while editing', async () => {
  await render(<UnknownConfirmationField label={ro.review.name} value="Iaurt" onChange={jest.fn()} disabled={false} />);
  expect(flat(screen.getByRole('button', { name: ro.review.name }))).toMatchObject(field);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.name }));
  expect(flat(screen.getByLabelText(ro.review.name))).toMatchObject({ ...field, borderColor: light.focus });
});

it('draws nutrient inputs with the shared field look and a terracotta border when invalid', async () => {
  await render(<NutritionFields values={empty} unclear={[]} invalid={{ fat: true }} onChange={jest.fn()} />);
  expect(flat(screen.getByTestId('nutrient-kcal'))).toMatchObject(field);
  expect(flat(screen.getByTestId('nutrient-fat')).borderColor).toBe(light.low);
});

it('draws the review form inputs as fields and the unit choice as pills', async () => {
  const label = ReadLabelResponse.parse({ ingredientsText: 'lapte', unit: 'g', nutrients: { kcal: 63, fat: 2.5, sat: 1.6, sugar: null, salt: 0, protein: 3, fiber: null, fruitVegPct: null }, unclear: [], ingredientsPhotoPath: 'uploads/dev-1/ing-1.jpg', nutritionPhotoPath: 'uploads/dev-1/nut-1.jpg' });
  const initial = parseAddParams({ code: '4840001000014', brand: 'Livada', name: 'Iaurt', quantity: '400 g', photoPath: 'uploads/dev-1/front-1.jpg' });
  await render(<ReviewForm label={label} initial={initial} categories={[]} onSubmit={jest.fn()} />);
  expect(flat(screen.getByLabelText(ro.review.brand))).toMatchObject(field);
  expect(flat(screen.getByRole('button', { name: ro.compare.per100('g') }))).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill });
  expect(flat(screen.getByRole('button', { name: ro.compare.per100('ml') }))).toMatchObject({ backgroundColor: light.sageSoft, borderWidth: 0 });
});
