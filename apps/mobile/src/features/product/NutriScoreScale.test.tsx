import { render, screen } from '@testing-library/react-native';
import { NutriScoreScale } from './NutriScoreScale';
import { dark as mockDarkColors, fonts, light as mockLight } from '../../theme/tokens';
import { letterTones } from '../../theme/letterTones';

let mockDark = false;
const letters = ['A', 'B', 'C', 'D', 'E'] as const;
jest.mock('../../theme/useTheme', () => ({ useTheme: () => ({ isDark: mockDark, colors: mockDark ? mockDarkColors : mockLight }) }));
for (const dark of [false, true]) describe(dark ? 'dark scale' : 'light scale', () => {
  const tones = dark ? letterTones.dark : letterTones.light;
  beforeEach(() => { mockDark = dark; });
  it.each(letters)('fills only %s with its own tone and announces its letter', async letter => {
    await render(<NutriScoreScale letter={letter} />);
    expect(screen.getByRole('image', { name: `Nutri-Score: ${letter}` })).toBeTruthy();
    expect(screen.getByTestId(`nutri-score-${letter}`)).toHaveStyle({ backgroundColor: tones[letter].fg });
    expect(screen.getByText(letter)).toHaveStyle({ color: tones.onSelected, fontFamily: fonts.heading });
    for (const other of letters.filter(value => value !== letter)) {
      expect(screen.getByTestId(`nutri-score-${other}`)).toHaveStyle({ backgroundColor: tones[other].bg });
      expect(screen.getByText(other)).toHaveStyle({ color: tones[other].fg });
    }
    expect(screen.getByText(letter).props.allowFontScaling).toBe(true);
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
