import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Ingredient } from '@okbite/shared';
import { AdditiveSheet } from './AdditiveSheet';
import { ro } from '../../copy/ro';

const caramel: Ingredient = {
  slug: 'colorant-caramel-e150d', name: 'Caramel cu sulfit de amoniu', group: 'add', role: 'Colorant sintetic (E150d)',
  explanation: 'Colorant maro obținut prin încălzirea zaharurilor.', source: 'https://eur-lex.europa.eu/eli/reg/2008/1333',
  allergen: null, risk: 'moderate', riskSource: 'https://www.efsa.europa.eu/en/efsajournal/pub/2004',
};
const sheet = (ingredient: Ingredient, onClose = jest.fn()) => render(<AdditiveSheet productId="p1" ingredient={ingredient} onClose={onClose} />);

it('shows name, E-number, role, risk chip and explanation', async () => {
  await sheet(caramel);
  expect(screen.getByText('Caramel cu sulfit de amoniu')).toBeTruthy();
  expect(screen.getByText('E150d')).toBeTruthy();
  expect(screen.getByText(`${ro.additives.role}: Colorant sintetic (E150d)`)).toBeTruthy();
  expect(screen.getByText(ro.additives.moderate)).toBeTruthy();
  expect(screen.getByText(caramel.explanation!)).toBeTruthy();
  expect(screen.queryByText(ro.additives.romanianOnly)).toBeNull();
});

it('shows "not assessed" when the additive has no risk level', async () => {
  await sheet({ ...caramel, risk: null, riskSource: null });
  expect(screen.getByText(ro.additives.notAssessed)).toBeTruthy();
  expect(screen.queryByText(ro.additives.moderate)).toBeNull();
});

it('opens the risk and explanation sources', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await sheet(caramel);
  await fireEvent.press(screen.getByRole('button', { name: ro.additives.source }));
  await fireEvent.press(screen.getByRole('button', { name: ro.additives.explanationSource }));
  expect(open.mock.calls).toEqual([[caramel.riskSource], [caramel.source]]);
});

it('hides each source link when its source is missing', async () => {
  await sheet({ ...caramel, riskSource: null, source: null });
  expect(screen.queryByRole('button', { name: ro.additives.source })).toBeNull();
  expect(screen.queryByRole('button', { name: ro.additives.explanationSource })).toBeNull();
});

it('says the explanation is coming when the knowledge base has none', async () => {
  await sheet({ ...caramel, slug: null, explanation: null, source: null, role: null });
  expect(screen.getByText(ro.ingredients.explanationSoon)).toBeTruthy();
  expect(screen.queryByText(new RegExp(`^${ro.additives.role}:`))).toBeNull();
});

it('opens the report sheet and closes', async () => {
  const onClose = jest.fn();
  await sheet(caramel, onClose);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.report }));
  expect(screen.getByText(ro.result.reportHint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  expect(screen.getByText(caramel.name)).toBeTruthy(); // cancelling the report returns to the additive
  expect(onClose).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(onClose).toHaveBeenCalled();
});
