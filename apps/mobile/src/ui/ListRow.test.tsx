import { render, screen } from '@testing-library/react-native';
import { light } from '../theme/tokens';
import { ListRow } from './ListRow';

it('shows an optional muted note under the title', async () => {
  await render(<ListRow title="OM Plată" score={null} tier={null} label="OM Plată" note="Scor indisponibil" onPress={() => {}} />);
  expect(screen.getByText('Scor indisponibil')).toHaveStyle({ color: light.muted });
});

it('shows no note line when none is given', async () => {
  await render(<ListRow title="Iaurt" score={80} tier="good" label="Iaurt" onPress={() => {}} />);
  expect(screen.queryByText('Scor indisponibil')).toBeNull();
});
