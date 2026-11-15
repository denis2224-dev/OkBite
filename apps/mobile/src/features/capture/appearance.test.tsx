import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ReadLabelResponse } from '@okbite/shared';
import { light, type Palette } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { foundYogurt } from '../../test/fixtures';
import { ReviewForm } from '../add/ReviewForm';
import { CandidateList } from '../identify/CandidateList';
import { ConfirmMatch } from '../identify/ConfirmMatch';
import { NotFound } from '../identify/NotFound';
import { ManualCode } from '../scan/ManualCode';

let mockColors: Palette = light;
jest.mock('../../theme/useTheme', () => ({ useTheme: () => ({ colors: mockColors }) }));
const candidate = { id: foundYogurt.product.id, name: foundYogurt.product.name.repeat(8),
  brand: foundYogurt.product.brand, quantity: foundYogurt.product.quantity,
  imageUrl: null, similarity: 0.7 };
const label = ReadLabelResponse.parse({ ingredientsText: foundYogurt.product.ingredientsText,
  unit: 'g', nutrients: foundYogurt.product.nutrients, unclear: ['salt'],
  ingredientsPhotoPath: 'uploads/test/ingredients.jpg', nutritionPhotoPath: null });
const initial = { name: candidate.name, brand: candidate.brand, quantity: candidate.quantity,
  code: foundYogurt.product.code, photoPath: null };
const style = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never);

describe.each([['light', light]] as const)('%s theme', (_name, colors) => {
  beforeEach(() => { mockColors = colors; });
  it('keeps review fields, selected categories and uncertain values readable', async () => {
    await render(<ReviewForm label={label} initial={initial}
      categories={[foundYogurt.product.category]} onSubmit={jest.fn()} />);
    expect(style(screen.getByLabelText(ro.review.name))).toMatchObject({ color: colors.ink, backgroundColor: colors.surface });
    expect(style(screen.getByRole('header', { name: ro.review.title }))).toMatchObject({ color: colors.ink });
    const category = screen.getByRole('button', { name: `${ro.review.category}: ${foundYogurt.product.category.name}` });
    await fireEvent.press(category);
    expect(style(category)).toMatchObject({ backgroundColor: colors.primary });
    expect(style(screen.getByTestId('unclear-salt'))).toMatchObject({ color: colors.medium });
    expect(screen.root?.props.keyboardShouldPersistTaps).toBe('handled');
  });
  it('shows long candidate names on the selected palette and preserves their action label', async () => {
    const select = jest.fn();
    await render(<CandidateList candidates={[candidate]} onSelect={select} onNone={jest.fn()} />);
    const name = screen.getByText(candidate.name);
    expect(style(name)).toMatchObject({ color: colors.ink });
    expect(name.props.numberOfLines).toBeUndefined();
    const action = screen.getByRole('button', { name: `${candidate.name}, ${candidate.brand}, ${candidate.quantity}` });
    expect(style(action)).toMatchObject({ backgroundColor: colors.surface });
    await fireEvent.press(action);
    expect(select).toHaveBeenCalledWith(candidate.id);
  });
  it('keeps confirmation copy readable', async () => {
    await render(<ConfirmMatch candidate={candidate} onConfirm={jest.fn()} onReject={jest.fn()} />);
    expect(style(screen.getByText(candidate.name))).toMatchObject({ color: colors.ink });
    expect(style(screen.getByText(ro.identify.confirmHint))).toMatchObject({ color: colors.muted });
  });
});

it('lets enlarged nutrition values and instructions reflow without fixed text boxes', async () => {
  await render(<ReviewForm label={label} initial={initial}
    categories={[foundYogurt.product.category]} onSubmit={jest.fn()} />);
  expect(style(screen.getByTestId('nutrient-salt')).width).toBeUndefined();
  expect(style(screen.getByText('kcal')).width).toBeUndefined();
});
it('lets the numbered instructions grow with the text', async () => {
  await render(<NotFound code={null} onAdd={jest.fn()} />);
  expect(style(screen.getByText('1').parent!).height).toBeUndefined();
  expect(style(screen.getByText(ro.identify.notFoundTitle))).toMatchObject({ color: mockColors.ink });
});
it('themes manual entry and disables editing while a lookup is in flight', async () => {
  await render(<ManualCode open onToggle={jest.fn()} disabled onSubmit={jest.fn()} />);
  const input = screen.getByLabelText(ro.scan.manualTitle);
  expect(style(input)).toMatchObject({ color: mockColors.ink, backgroundColor: mockColors.surface });
  expect(input.props.editable).toBe(false);
});
