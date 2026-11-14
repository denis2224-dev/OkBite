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
  await render(<AdditivesCard product={withIngredients([milk, add('Caramel', 'moderate'), add('Aspartam', null)])} />);
  expect(screen.getByRole('button', { name: `Caramel, ${ro.additives.moderate}` })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Aspartam, ${ro.additives.notAssessed}` })).toBeTruthy();
  expect(screen.getByText(ro.additives.moderate)).toBeTruthy();
  expect(screen.queryByText('Lapte')).toBeNull();
});

it('opens the additive sheet when a row is tapped', async () => {
  await render(<AdditivesCard product={withIngredients([add('Caramel', 'high')])} />);
  await fireEvent.press(screen.getByRole('button', { name: `Caramel, ${ro.additives.high}` }));
  expect(screen.getByText('Despre Caramel')).toBeTruthy();
});

it('renders nothing without additives', async () => {
  await render(<AdditivesCard product={withIngredients([milk])} />);
  expect(screen.toJSON()).toBeNull();
});
