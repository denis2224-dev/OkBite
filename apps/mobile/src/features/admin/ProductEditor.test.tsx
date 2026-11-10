import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProductEditor } from './ProductEditor';
import { ro } from '../../copy/ro';
const initial = {
  code: null,
  name: 'Iaurt',
  brand: 'Test',
  quantity: '100 g',
  categorySlug: 'iaurt',
  unit: 'g' as const,
  ingredientsText: 'lapte',
  nutrients: {
    kcal: 63,
    fat: 2.5,
    sat: 1.6,
    sugar: 4.1,
    salt: 0.1,
    protein: 3.6,
    fiber: null,
    fruitVegPct: null,
  },
};
it('empty name shows a validation error and sends no moderation request', async () => {
  const save = jest.fn();
  await render(<ProductEditor initial={initial} onSave={save} />);
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), '');
  await fireEvent.press(screen.getByText('Verifică și salvează'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(save).not.toHaveBeenCalled();
});
it('submits decimal-comma nutrients and preserves missing values as null', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<ProductEditor initial={initial} onSave={save} />);
  expect(screen.getByLabelText(ro.review.nutrients.fat).props.value).toBe('2,5');
  await fireEvent.changeText(screen.getByLabelText(ro.review.nutrients.salt), '0,3');
  await fireEvent.press(screen.getByText('Verifică și salvează'));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      ...initial,
      nutrients: { ...initial.nutrients, salt: 0.3 },
    }),
  );
});
it('rejects a barcode with the wrong check digit before saving', async () => {
  const save = jest.fn();
  await render(<ProductEditor initial={initial} onSave={save} />);
  await fireEvent.changeText(screen.getByLabelText(ro.scan.manualLabel), '4840001000015');
  await fireEvent.press(screen.getByText(ro.app.admin.verify));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(save).not.toHaveBeenCalled();
});
it('makes the moderator name a brand left blank by the shopper before verifying', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<ProductEditor initial={{ ...initial, brand: '' }} onSave={save} />);
  await fireEvent.press(screen.getByText('Verifică și salvează'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(save).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(ro.review.brand), 'Zorel');
  await fireEvent.press(screen.getByText('Verifică și salvează'));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ ...initial, brand: 'Zorel' }));
});
