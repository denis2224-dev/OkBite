import * as native from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScoreRing } from './ScoreRing';
it('announces score and quality together', async () => { await render(<ScoreRing score={78} grade="good"/>); expect(screen.getByLabelText('78 din 100, calitate nutrițională bună')).toBeTruthy(); });
it('never announces zero for a missing score', async () => { await render(<ScoreRing score={null} grade="unavailable"/>); expect(screen.getByLabelText('Scor indisponibil')).toBeTruthy(); expect(screen.queryByText('0')).toBeNull(); });
it('reserves space for the score and caption at 200 percent font scaling', async () => {
  const dimensions = jest.spyOn(native, 'useWindowDimensions').mockReturnValue({ width: 360, height: 800, scale: 2, fontScale: 2 });
  try {
    await render(<ScoreRing score={100} grade="good" />);
    const ring = screen.getByLabelText('100 din 100, calitate nutrițională bună');
    expect(native.StyleSheet.flatten(ring.props.style).height).toBeGreaterThanOrEqual(200);
    expect(screen.getByText('100').props.allowFontScaling).toBe(true);
  } finally { dimensions.mockRestore(); }
});
