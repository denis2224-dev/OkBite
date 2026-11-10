import { render, screen } from '@testing-library/react-native';
import { NutriScoreScale } from './NutriScoreScale';
import { light as mockLight, dark as mockDarkColors } from '../../theme/tokens';

let mockDark = false;
jest.mock('../../theme/useTheme', () => ({ useTheme: () => ({ colors: mockDark ? mockDarkColors : mockLight }) }));
for (const dark of [false, true]) describe(dark ? 'dark scale' : 'light scale', () => {
  beforeEach(() => { mockDark = dark; });
  it.each(['A', 'B', 'C', 'D', 'E'] as const)('marks only %s with an outline and announces its letter', async letter => {
    await render(<NutriScoreScale letter={letter} />);
    expect(screen.getByRole('image', { name: `Nutri-Score: ${letter}` })).toBeTruthy();
    const colors = dark ? mockDarkColors : mockLight;
    const tone = letter === 'A' || letter === 'B' ? 'good' : letter === 'C' ? 'medium' : 'low';
    expect(screen.getByTestId(`nutri-score-${letter}`)).toHaveStyle({ borderColor: colors[tone] });
    for (const other of ['A', 'B', 'C', 'D', 'E'].filter(value => value !== letter)) {
      expect(screen.getByTestId(`nutri-score-${other}`)).toHaveStyle({ borderColor: colors.transparent });
    }
    expect(screen.getByText(letter)).toHaveStyle({ fontWeight: '800' });
    expect(screen.getByText(letter).props.allowFontScaling).toBe(true);
  });
});
it('omits the scale when the backend has no letter', async () => {
  await render(<NutriScoreScale letter={null} />);
  expect(screen.queryByRole('image')).toBeNull();
  expect(screen.queryByText('A')).toBeNull();
});
