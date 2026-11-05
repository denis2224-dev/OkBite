import { render, screen } from '@testing-library/react-native';
import { ScoreRing } from './ScoreRing';
it('announces score and quality together', async () => { await render(<ScoreRing score={78} grade="good"/>); expect(screen.getByLabelText('78 din 100, calitate nutrițională bună')).toBeTruthy(); });
it('never announces zero for a missing score', async () => { await render(<ScoreRing score={null} grade="unavailable"/>); expect(screen.getByLabelText('Scor indisponibil')).toBeTruthy(); expect(screen.queryByText('0')).toBeNull(); });
