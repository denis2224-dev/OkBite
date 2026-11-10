import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ro } from '../../copy/ro';
import { openPhoto } from '../offline/photos';
import { UnknownProductConfirmation, type UnknownProductConfirmationProps } from './UnknownProductConfirmation';

jest.mock('../offline/photos', () => ({ openPhoto: jest.fn() }));
const mockOpen = jest.mocked(openPhoto);
const initial = { code: null, brand: null, name: 'Produs test', quantity: null, photoPath: 'uploads/front.jpg' };
const nutrients = { kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null };
const label = { ingredientsText: 'ingrediente test', unit: 'g' as const, nutrients, unclear: [], ingredientsPhotoPath: 'uploads/ingredients.jpg', nutritionPhotoPath: null };
const photos = { front: 'front-id', ingredients: 'ingredients-id', nutrition: null };
function props(overrides: Partial<UnknownProductConfirmationProps> = {}): UnknownProductConfirmationProps {
  return { initial, label, photos, categories: [], onConfirm: jest.fn(async () => {}), onRetake: jest.fn(), ...overrides };
}
beforeEach(() => { mockOpen.mockReset(); mockOpen.mockImplementation(async id => ({ uri: `blob:${id}`, release: jest.fn() })); });

it('confirms ingredients without keyboard, category or brand; the unit is one tap, never guessed', async () => {
  const input = props({ label: { ...label, unit: null }, onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  expect(screen.queryByRole('button', { name: /^Categorie:/ })).toBeNull();
  expect(screen.getByText(ro.add.unitQuestion)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.add.confirmSave })).toBeDisabled();
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.add.unitMl })); });
  expect(input.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ unit: 'ml' }));
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave })); });
  expect(input.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ name: 'Produs test', brand: '', unit: 'ml', nutrients }));
  expect(jest.mocked(input.onConfirm).mock.calls[0]?.[0].categorySlug).toBeUndefined();
});

it('opens an editor on tap and emits corrected values before confirmation', async () => {
  const input = props({ onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.name }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Denumire corectată');
  expect(input.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Denumire corectată', brand: '' }));
});

it('shows partial values with decimal commas and preserves printed zero', async () => {
  const input = props({ label: { ...label, unit: 'ml', nutrients: { ...nutrients, sugar: 13.2, salt: 0 } } });
  await render(<UnknownProductConfirmation {...input} />);
  expect(screen.getByText('13,2 g')).toBeTruthy();
  expect(screen.getByText('0 g')).toBeTruthy();
  expect(screen.getByText(ro.add.basisMl)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.review.nutrients.kcal })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.review.nutrients.sugar }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.nutrients.sugar), '0,3');
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave })); });
  expect(input.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ nutrients: { ...nutrients, sugar: 0.3, salt: 0 } }));
});

it('blocks malformed numeric edits instead of saving zero or NaN', async () => {
  const input = props({ label: { ...label, unit: 'g', nutrients: { ...nutrients, salt: 0 } }, onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.nutrients.salt }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.nutrients.salt), 'abc');
  expect(screen.getByRole('button', { name: ro.add.confirmSave })).toBeDisabled();
  expect(input.onChange).not.toHaveBeenCalled();
  await fireEvent(screen.getByLabelText(ro.review.nutrients.salt), 'blur');
  expect(screen.getByLabelText(ro.review.nutrients.salt).props.value).toBe('abc');
});

it.each(['not_printed', 'not_photographed'])('does not describe %s nutrients as blurry', async reason => {
  await render(<UnknownProductConfirmation {...props({ label: { ...label, unclear: ['kcal'], reasons: { kcal: reason } } })} />);
  expect(screen.queryByText(ro.add.nutritionUnreadable)).toBeNull();
  expect(screen.queryByText(ro.review.unclearText)).toBeNull();
});

it('targets only the unreadable photo and keeps edited data available', async () => {
  const input = props({ label: { ...label, unclear: ['salt'], reasons: { salt: 'unreadable' } }, onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: `${ro.add.retakePhoto}: ${ro.review.nutritionTitle}` }));
  expect(input.onRetake).toHaveBeenCalledWith('nutrition');
  expect(input.photos).toEqual(photos);
});

it('offers front retake and manual ingredients fallback without opening a keyboard', async () => {
  const input = props({ initial: { ...initial, name: null }, label: { ...label, ingredientsText: null }, onManual: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  expect(screen.getByRole('button', { name: ro.add.confirmSave })).toBeDisabled();
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: `${ro.add.retakePhoto}: ${ro.review.name}` }));
  expect(input.onRetake).toHaveBeenCalledWith('front');
  await fireEvent.press(screen.getByRole('button', { name: ro.add.manualEntry }));
  expect(input.onManual).toHaveBeenCalledTimes(1);
});

it('guards rapid double confirmation and shows pending feedback', async () => {
  let finish!: () => void;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  const input = props({ onConfirm: jest.fn(() => waiting) });
  await render(<UnknownProductConfirmation {...input} />);
  const submit = screen.getByRole('button', { name: ro.add.confirmSave });
  await fireEvent.press(submit);
  await fireEvent.press(submit);
  expect(input.onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: ro.add.savePending })).toBeDisabled();
  await act(async () => { finish(); await waiting; });
});

it('releases opened photo handles, including a handle arriving after unmount', async () => {
  const releases = [jest.fn(), jest.fn()] as const;
  let finish!: (handle: { uri: string; release(): void }) => void;
  mockOpen.mockResolvedValueOnce({ uri: 'blob:front', release: releases[0] });
  mockOpen.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const rendered = await render(<UnknownProductConfirmation {...props()} />);
  await act(async () => {});
  await rendered.unmount();
  await act(async () => { finish({ uri: 'blob:ingredients', release: releases[1] }); });
  expect(releases[0]).toHaveBeenCalledTimes(1);
  expect(releases[1]).toHaveBeenCalledTimes(1);
});

it('keeps a cleared numeric editor available while the shopper replaces its value', async () => {
  const input = props({ label: { ...label, unit: 'g', nutrients: { ...nutrients, salt: 0 } }, onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.nutrients.salt }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.nutrients.salt), '');
  await fireEvent(screen.getByLabelText(ro.review.nutrients.salt), 'blur');
  expect(screen.queryByText('null g')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.review.nutrients.salt }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.nutrients.salt), '0,3');
  expect(input.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ nutrients: { ...nutrients, salt: 0.3 } }));
});

it('reveals category and printed basis choices only when requested', async () => {
  const input = props({ categories: [{ slug: 'test', name: 'Categorie test', scoreKind: 'general' }],
    label: { ...label, unit: 'g', nutrients: { ...nutrients, salt: 0 } }, onChange: jest.fn() });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: `${ro.add.categoryOptional}: ${ro.add.unknownCategory}` }));
  await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Categorie test` }));
  await fireEvent.press(screen.getByRole('button', { name: ro.review.per100 }));
  await fireEvent.press(screen.getByRole('button', { name: ro.compare.per100('ml') }));
  expect(input.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ categorySlug: 'test', unit: 'ml' }));
});

it('keeps corrections and retry available when confirmation fails', async () => {
  const input = props({ onConfirm: jest.fn(async () => { throw new Error('offline'); }) });
  await render(<UnknownProductConfirmation {...input} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.name }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Corectat');
  await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  expect(screen.getByText(ro.add.saveFailed)).toBeTruthy();
  expect(screen.getByLabelText(ro.review.name).props.value).toBe('Corectat');
  expect(screen.getByRole('button', { name: ro.add.confirmSave })).toBeEnabled();
});

it('restores an optional category correction without requiring another selection', async () => {
  const input = props({ initial: { ...initial, categorySlug: 'test' }, categories: [{ slug: 'test', name: 'Categorie test', scoreKind: 'general' }] });
  await render(<UnknownProductConfirmation {...input} />);
  expect(screen.getByRole('button', { name: `${ro.add.categoryOptional}: Categorie test` })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  expect(input.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: 'test' }));
});
