import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { light, radii } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';

const candidate = { id: 'p1', name: 'Iaurt natural', brand: 'Livada', quantity: '400 g', imageUrl: null, similarity: 0.5 } as unknown as Candidate;
const card = { backgroundColor: light.surface, borderWidth: 0, borderRadius: radii.card, ...depth.raised };

it('draws candidate rows as raised cards', async () => {
  await render(<CandidateList candidates={[candidate]} onSelect={jest.fn()} onNone={jest.fn()} />);
  const row = screen.getByRole('button', { name: /Iaurt natural/ });
  expect(StyleSheet.flatten(row.props.style)).toMatchObject(card);
});

it('draws the match to confirm in a raised card', async () => {
  await render(<ConfirmMatch candidate={candidate} onConfirm={jest.fn()} onReject={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByTestId('confirm-match-card').props.style)).toMatchObject(card);
});
