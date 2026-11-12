import { render, screen } from '@testing-library/react-native';
import { NutriScoreScale } from './NutriScoreScale';
import { dark as mockDarkColors, light as mockLight } from '../../theme/tokens';
import { letterTones } from '../../theme/letterTones';

let mockDark = false;
const letters = ['A', 'B', 'C', 'D', 'E'] as const;
jest.mock('../../theme/useTheme', () => ({ useTheme: () => ({ isDark: mockDark, colors: mockDark ? mockDarkColors : mockLight }) }));
for (const dark of [false, true]) describe(dark ? 'dark scale' : 'light scale', () => {
  const tones = dark ? letterTones.dark : letterTones.light;
  beforeEach(() => { mockDark = dark; });
  it.each(letters)('fills and outlines only %s on a thin bar and announces its letter', async letter => {
    const colors = dark ? mockDarkColors : mockLight;
    await render(<NutriScoreScale letter={letter} />);
    expect(screen.getByRole('image', { name: `Nutri-Score: ${letter}` })).toBeTruthy();
    expect(screen.getByTestId(`nutri-score-${letter}`)).toHaveStyle({ backgroundColor: tones[letter].fg, borderWidth: 2, borderColor: colors.ink });
    for (const other of letters.filter(value => value !== letter)) {
      expect(screen.getByTestId(`nutri-score-${other}`)).toHaveStyle({ backgroundColor: tones[other].bg, borderWidth: 0 });
    }
    // The letter itself is shown in the score tile; the bar carries it in its label.
    for (const value of letters) expect(screen.queryByText(value)).toBeNull();
  });
  it('gives each of the five letters a distinct colour', () => {
    expect(new Set(letters.map(letter => tones[letter].fg)).size).toBe(5);
  });
});
it('omits the scale when the backend has no letter', async () => {
  await render(<NutriScoreScale letter={null} />);
  expect(screen.queryByRole('image')).toBeNull();
  expect(screen.queryByText('A')).toBeNull();
});
