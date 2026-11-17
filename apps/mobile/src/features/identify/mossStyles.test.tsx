import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { light, radii } from '../../theme/tokens';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';

const candidate = { id: 'p1', name: 'Iaurt natural', brand: 'Livada', quantity: '400 g', imageUrl: null, similarity: 0.5 } as unknown as Candidate;
const card = { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: radii.card };

it('draws candidate rows as flat bordered cards', async () => {
  await render(<CandidateList candidates={[candidate]} onSelect={jest.fn()} onNone={jest.fn()} />);
  const row = screen.getByRole('button', { name: /Iaurt natural/ });
  expect(StyleSheet.flatten(row.props.style)).toMatchObject(card);
});

it('draws the match to confirm in a flat bordered card', async () => {
  await render(<ConfirmMatch candidate={candidate} onConfirm={jest.fn()} onReject={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByTestId('confirm-match-card').props.style)).toMatchObject(card);
});
