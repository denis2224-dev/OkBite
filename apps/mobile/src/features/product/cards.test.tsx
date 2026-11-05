import { render, screen } from '@testing-library/react-native';
import { ScoreCard } from './ScoreCard';
import { PortionTable } from './PortionTable';
import { SourceCard } from './SourceCard';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

it('shows unavailable instead of zero and always includes the disclaimer', async () => {
  await render(<ScoreCard score={{ score: null, grade: 'unavailable', letter: null, reasons: [], missing: ['salt'] }} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByLabelText(/0 din 100/)).toBeNull();
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
});
it('shows the supplied score reasons without calculating a new score', async () => {
  await render(<ScoreCard score={{ ...foundYogurt.score, reasons: [{ tone: 'neutral', title: 'Motiv de test', detail: 'Detaliu de test' }] }} />);
  expect(screen.getByText('Motiv de test')).toBeTruthy();
  expect(screen.getByText('Detaliu de test')).toBeTruthy();
});
it('keeps missing nutrients undeclared in the portion table', async () => {
  await render(<PortionTable product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} />);
  expect(screen.getAllByText(ro.result.undeclared).length).toBeGreaterThan(0);
  expect(screen.getByText(ro.result.portionNote)).toBeTruthy();
});
it('does not claim verification for an unverified source', async () => {
  await render(<SourceCard product={{ ...foundYogurt.product, status: 'unverified', verifiedAt: null }} />);
  expect(screen.getByText(ro.result.unverified)).toBeTruthy();
  expect(screen.queryByText(ro.result.verified)).toBeNull();
  expect(screen.getByText(foundYogurt.product.source)).toBeTruthy();
});
