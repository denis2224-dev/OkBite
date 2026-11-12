import { render, screen } from '@testing-library/react-native';
import type { Ingredient } from '@okbite/shared';
import { AdditiveSheet } from './AdditiveSheet';

jest.mock('../../copy/lang', () => ({ getLanguage: () => 'en' }));

const additive: Ingredient = {
  slug: 'aspartam-e951', name: 'Aspartam (E951)', group: 'add', role: 'Îndulcitor', explanation: 'Îndulcitor intens.',
  source: 'https://eur-lex.europa.eu/eli/reg/2008/1333', allergen: null, risk: 'high', riskSource: 'https://www.efsa.europa.eu/x',
};

it('uses English labels and keeps the Romanian explanation with a note', async () => {
  await render(<AdditiveSheet productId="p1" ingredient={additive} onClose={jest.fn()} />);
  expect(screen.getByText('High risk')).toBeTruthy();
  expect(screen.getByText('Role: Îndulcitor')).toBeTruthy();
  expect(screen.getByText('Îndulcitor intens.')).toBeTruthy();
  expect(screen.getByText('The explanation is available in Romanian.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Assessment source' })).toBeTruthy();
  expect(screen.queryByText('E951')).toBeNull(); // already in the name
});
