import { fireEvent, render, screen } from '@testing-library/react-native';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { ScoreDeductions } from './ScoreDeductions';
import { productScoreFor } from './productScoreFor';

const { product, score } = foundYogurt;

it('starts collapsed and lists every deduction with its points when opened', async () => {
  const { deductions } = productScoreFor(product, score);
  await render(<ScoreDeductions product={product} score={score} />);
  const toggle = screen.getByRole('button', { name: ro.tiers.why });
  expect(screen.queryByText(ro.ledger.points(deductions[0]!.points))).toBeNull();
  await fireEvent.press(toggle);
  for (const d of deductions.filter(d => d.points > 0)) expect(screen.getAllByText(ro.ledger.points(d.points)).length).toBeGreaterThan(0);
  expect(screen.getAllByTestId('deduction-row')).toHaveLength(deductions.length);
});

it('names an additive deduction after the additive', async () => {
  const additive = { ...product.ingredients[0]!, slug: 'e211', name: 'E211', group: 'add' as const, risk: 'moderate' as const, riskSource: 'https://efsa.europa.eu/x' };
  await render(<ScoreDeductions product={{ ...product, ingredients: [...product.ingredients, additive] }} score={score} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.tiers.why }));
  expect(screen.getByText(`${ro.ledger.additive}: E211`)).toBeTruthy();
});

it('renders nothing without a score', async () => {
  await render(<ScoreDeductions product={{ ...product, nutrients: { ...product.nutrients, salt: null } }} score={score} />);
  expect(screen.queryByRole('button', { name: ro.tiers.why })).toBeNull();
});
