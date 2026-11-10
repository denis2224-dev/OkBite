import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ro } from '../../copy/ro';
import { GuidedNutritionQuestion } from './GuidedNutritionQuestion';

test.each([
  ['separate', 'nutritionYes'], ['same_photo', 'nutritionSame'],
  ['none', 'nutritionNone'], ['skipped', 'nutritionSkip'],
] as const)('maps the %s answer to its explicit mode', async (mode, key) => {
  const choose = jest.fn();
  await render(<GuidedNutritionQuestion onChoose={choose} />);
  fireEvent.press(screen.getByRole('button', { name: ro.add[key] }));
  expect(choose).toHaveBeenCalledWith(mode);
});

test('disables all four answers while a read starts', async () => {
  const choose = jest.fn();
  await render(<GuidedNutritionQuestion onChoose={choose} disabled />);
  for (const key of ['nutritionYes', 'nutritionSame', 'nutritionNone', 'nutritionSkip'] as const) {
    expect(screen.getByRole('button', { name: ro.add[key] })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: ro.add[key] }));
  }
  expect(choose).not.toHaveBeenCalled();
});
