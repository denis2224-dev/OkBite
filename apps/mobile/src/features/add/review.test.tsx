import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import {
  AddProductRequest,
  Category,
  ReadLabelResponse,
  type AddProductRequest as AddProductRequestType,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { parseAddParams } from '../identify/routes';
import { ReviewForm } from './ReviewForm';

const CATEGORIES = [
  Category.parse({ slug: 'iaurt', name: 'Iaurturi', scoreKind: 'general' }),
  Category.parse({ slug: 'biscuiti', name: 'Biscuiți', scoreKind: 'general' }),
  Category.parse({ slug: 'suc', name: 'Sucuri', scoreKind: 'beverage' }),
];

const BASE_LABEL = ReadLabelResponse.parse({
  ingredientsText: 'lapte normalizat, culturi lactice vii. Poate conține urme de arahide.',
  unit: 'g',
  nutrients: {
    kcal: 63,
    fat: 2.5,
    sat: 1.6,
    sugar: null,
    salt: 0,
    protein: 3.6,
    fiber: 0,
    fruitVegPct: null,
  },
  unclear: ['ingredientsText', 'sugar'],
  ingredientsPhotoPath: 'uploads/dev-1/ing-1.jpg',
  nutritionPhotoPath: 'uploads/dev-1/nut-1.jpg',
});

const BASE_INITIAL = parseAddParams({
  code: '4840001000014',
  brand: 'Livada Verde',
  name: 'Iaurt natural 2,5%',
  quantity: '400 g',
  photoPath: 'uploads/dev-1/front-1.jpg',
});

describe('ReviewForm and CategoryPicker (B7 slice)', () => {
  it('pre-fills fields from parseAddParams and ReadLabelResponse, marks unclear fields, and disables save until category is chosen', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue('Iaurt natural 2,5%')).toBeTruthy();
    expect(screen.getByDisplayValue('Livada Verde')).toBeTruthy();
    expect(screen.getByDisplayValue('400 g')).toBeTruthy();
    expect(screen.getByDisplayValue('4840001000014')).toBeTruthy();
    expect(screen.getByDisplayValue(BASE_LABEL.ingredientsText!)).toBeTruthy();
    expect(screen.getByDisplayValue('63')).toBeTruthy();
    expect(screen.getByDisplayValue('2,5')).toBeTruthy();
    expect(screen.getByDisplayValue('1,6')).toBeTruthy();

    // Unclear banner and field markers
    expect(screen.getByText(ro.review.unclearTitle)).toBeTruthy();
    expect(screen.getByText(ro.review.unclearText)).toBeTruthy();
    expect(screen.getByText(ro.review.unreadMark)).toBeTruthy();
    expect(screen.getByTestId('unclear-ingredientsText')).toBeTruthy();
    expect(screen.getByTestId('unclear-sugar')).toBeTruthy();
    expect(screen.queryByTestId('unclear-kcal')).toBeNull();
    expect(screen.getAllByText(ro.review.unclearField)).toHaveLength(2);

    // Save is disabled until category is selected
    const saveButton = screen.getByRole('button', { name: ro.review.save });
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(saveButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('updates detected allergens and mayContain traces live using detectAllergens as ingredientsText changes', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Lapte')).toBeTruthy();
    expect(screen.getByText('Arahide')).toBeTruthy();

    const ingInput = screen.getByLabelText(ro.review.ingredients);
    await fireEvent.changeText(ingInput, 'apă, zahăr, suc de mere');
    expect(screen.getByText(ro.review.allergensNone)).toBeTruthy();
    expect(screen.queryByText('Lapte')).toBeNull();

    await fireEvent.changeText(
      ingInput,
      'făină de grâu, unt de cacao, lecitină din soia. Poate conține: ouă și susan.',
    );
    expect(screen.getByText('Gluten')).toBeTruthy();
    expect(screen.getByText('Soia')).toBeTruthy();
    expect(screen.queryByText('Lapte')).toBeNull(); // "unt de cacao" is not milk
    expect(screen.getByText('Ouă')).toBeTruthy();
    expect(screen.getByText('Susan')).toBeTruthy();
  });

  it('explains unavailable categories using approved copy and prevents submission when categories is empty', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={[]}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(ro.result.insufficientData)).toBeTruthy();
    const saveButton = screen.getByRole('button', { name: ro.review.save });
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(saveButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('preserves numeric 0 vs null for empty nutrients, preserves null photoPath/nutritionPhotoPath, and validates with AddProductRequest', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    const labelSinglePhoto = ReadLabelResponse.parse({
      ...BASE_LABEL,
      nutritionPhotoPath: null,
    });
    const initialNoPhoto = parseAddParams({
      brand: 'Livada Verde',
      name: 'Iaurt natural 2,5%',
      quantity: '400 g',
    });

    await render(
      <ReviewForm
        label={labelSinglePhoto}
        initial={initialNoPhoto}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurturi` }));
    // Leave sugar and fruitVegPct empty (null), set salt to "0,3" and fiber to "0"
    await fireEvent.changeText(screen.getByTestId('nutrient-salt'), '0,3');
    await fireEvent.changeText(screen.getByTestId('nutrient-fiber'), '0');

    const saveButton = screen.getByRole('button', { name: ro.review.save });
    expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted).toBeDefined();
    expect(AddProductRequest.safeParse(submitted).success).toBe(true);
    expect(submitted).toEqual({
      code: null,
      name: 'Iaurt natural 2,5%',
      brand: 'Livada Verde',
      quantity: '400 g',
      unit: 'g',
      categorySlug: 'iaurt',
      ingredientsText: BASE_LABEL.ingredientsText,
      nutrients: {
        kcal: 63,
        fat: 2.5,
        sat: 1.6,
        sugar: null,
        salt: 0.3,
        protein: 3.6,
        fiber: 0,
        fruitVegPct: null,
      },
      photoPath: null,
      ingredientsPhotoPath: 'uploads/dev-1/ing-1.jpg',
      nutritionPhotoPath: null,
    });
  });

  it('rejects nonempty invalid nutrient inputs (including unsupported units like 300 mg or 418 kJ, sat > fat, and invalid barcodes) instead of turning them into null', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurturi` }));

    // 1. Unsupported unit "300 mg" on salt -> error, no submit
    await fireEvent.changeText(screen.getByTestId('nutrient-salt'), '300 mg');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-salt')).toBeTruthy();

    // 2. Unsupported unit "418 kJ" on kcal -> error, no submit
    await fireEvent.changeText(screen.getByTestId('nutrient-salt'), '0,3');
    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '418 kJ');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-kcal')).toBeTruthy();

    // 3. Incompatible suffix "13.2 g" on kcal -> error, no submit
    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '13.2 g');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-kcal')).toBeTruthy();

    // 4. sat > fat -> shows ro.review.satOverFat, no submit
    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '63 kcal');
    await fireEvent.changeText(screen.getByTestId('nutrient-sat'), '5,0');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(ro.review.satOverFat)).toBeTruthy();

    // 5. Invalid optional barcode -> shows ro.scan.manualInvalid, no submit
    await fireEvent.changeText(screen.getByTestId('nutrient-sat'), '1,6 g');
    await fireEvent.changeText(screen.getByTestId('input-code'), '4840001000017');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(ro.scan.manualInvalid)).toBeTruthy();
  });

  it('prevents duplicate submissions while onSubmit is pending', async () => {
    let resolveSubmit!: () => void;
    const onSubmit = jest.fn(
      (_req: AddProductRequestType) =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurturi` }));
    const saveButton = screen.getByRole('button', { name: ro.review.save });

    await fireEvent.press(saveButton);
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit();
    });
  });
});

