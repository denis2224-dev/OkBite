import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Ingredient } from '@okbite/shared';
import { AdditivesCard } from './AdditivesCard';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

const add = (name: string, risk: Ingredient['risk']): Ingredient =>
  ({ slug: null, name, group: 'add', role: null, explanation: `Despre ${name}`, source: null, allergen: null, risk, riskSource: null });
const milk: Ingredient = { slug: null, name: 'Lapte', group: 'base', role: null, explanation: null, source: null, allergen: null };
const withIngredients = (ingredients: Ingredient[]) => ({ ...foundYogurt.product, ingredients, ingredientsText: '' });

it('lists only additives, each with its risk chip', async () => {
  await render(<AdditivesCard product={withIngredients([milk, add('Aditiv A', 'moderate'), add('Aditiv B', null)])} />);
  expect(screen.getByRole('button', { name: `Aditiv A, ${ro.additives.moderate}` })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Aditiv B, ${ro.additives.notAssessed}` })).toBeTruthy();
  expect(screen.getByText(ro.additives.moderate)).toBeTruthy();
  expect(screen.queryByText('Lapte')).toBeNull();
});

it('opens the additive sheet when a row is tapped', async () => {
  await render(<AdditivesCard product={withIngredients([add('Aditiv A', 'high')])} />);
  await fireEvent.press(screen.getByRole('button', { name: `Aditiv A, ${ro.additives.high}` }));
  expect(screen.getByText('Despre Aditiv A')).toBeTruthy();
});

it('renders nothing without additives', async () => {
  await render(<AdditivesCard product={withIngredients([milk])} />);
  expect(screen.toJSON()).toBeNull();
});

it('pressing "Pectină (E440)", stored with only its name, shows what it is, its risk and both sources from the knowledge base', async () => {
  const pectin: Ingredient = { slug: null, name: 'Pectină (E440)', group: 'add', role: 'Gelifiant', explanation: null, source: null, allergen: null };
  await render(<AdditivesCard product={withIngredients([pectin])} />);
  await fireEvent.press(screen.getByRole('button', { name: `Pectină (E440), ${ro.additives.low}` }));
  expect(screen.getByText(/Fibră solubilă extrasă din fructe/)).toBeTruthy();
  expect(screen.queryByText(ro.ingredients.explanationSoon)).toBeNull();
  expect(screen.getByRole('link', { name: ro.additives.source })).toBeTruthy();
  expect(screen.getByRole('link', { name: ro.additives.explanationSource })).toBeTruthy();
});
