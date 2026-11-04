import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import {
  AddProductRequest,
  Category,
  LookupResponse,
  ReadLabelResponse,
  type AddProductRequest as AddProductRequestType,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { parseAddParams } from '../identify/routes';
import ReviewRouteScreen from '../../../app/add/review';
import { clearAddReviewDraft, setAddReviewDraft } from './draftStore';
import { ReviewForm } from './ReviewForm';

const mockReplace = jest.fn<(href: unknown) => void>();
const mockAddProduct = jest.fn<(req: AddProductRequestType) => Promise<LookupResponse>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../lib/api', () => ({
  api: {
    addProduct: (req: AddProductRequestType) => mockAddProduct(req),
  },
}));

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

const SAVED_LOOKUP = LookupResponse.parse({
  status: 'found',
  product: {
    id: '2a7c9e40-1b2c-4d5e-8f90-1234567890ab',
    code: '4840001000014',
    status: 'unverified',
    name: 'Iaurt natural 2,5%',
    brand: 'Livada Verde',
    quantity: '400 g',
    category: CATEGORIES[0],
    unit: 'g',
    portion: { amount: 100, label: '100 g' },
    nutrients: BASE_LABEL.nutrients,
    ingredientsText: BASE_LABEL.ingredientsText!,
    ingredients: [],
    allergens: ['Lapte'],
    mayContain: ['Arahide'],
    imageUrl: null,
    labelImageUrl: null,
    source: 'Utilizator',
    addedAt: '2026-11-04',
    verifiedAt: null,
  },
  score: {
    score: null,
    letter: null,
    grade: 'unavailable',
    reasons: [],
    missing: ['sugar'],
  },
});

describe('ReviewForm, CategoryPicker and /add/review route (B7)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearAddReviewDraft();
  });

  it('pre-fills fields from parseAddParams and ReadLabelResponse, marks unclear fields, does not render technical nutrient keys as labels, and disables save until category is chosen', async () => {
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

    // Do not expose raw technical keys like sugar or fruitVegPct as visible user-facing labels
    expect(screen.queryByText('sugar')).toBeNull();
    expect(screen.queryByText('fruitVegPct')).toBeNull();
    expect(screen.queryByText('protein')).toBeNull();

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

  it('requires explicit unit selection when OCR returns unit: null instead of silently assuming g', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    const labelNullUnit = ReadLabelResponse.parse({
      ...BASE_LABEL,
      unit: null,
    });

    await render(
      <ReviewForm
        label={labelNullUnit}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Sucuri` }));
    const saveButton = screen.getByRole('button', { name: ro.review.save });
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(saveButton);
    expect(onSubmit).not.toHaveBeenCalled();

    // Explicitly select ml
    await fireEvent.press(screen.getByRole('button', { name: ro.compare.per100('ml') }));
    expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]?.unit).toBe('ml');
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
    expect(screen.queryByText('Lapte')).toBeNull();
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

    await fireEvent.changeText(screen.getByTestId('nutrient-salt'), '300 mg');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-salt')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('nutrient-salt'), '0,3');
    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '418 kJ');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-kcal')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '13.2 g');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-kcal')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('nutrient-kcal'), '63 kcal');
    await fireEvent.changeText(screen.getByTestId('nutrient-sat'), '5,0');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(ro.review.satOverFat)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('nutrient-sat'), '1,6 g');
    await fireEvent.changeText(screen.getByTestId('input-code'), '4840001000017');
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(ro.scan.manualInvalid)).toBeTruthy();
  });

  it('catches rejected onSubmit calls, shows the approved Romanian error, preserves user edits, releases lock, and allows retry', async () => {
    let callCount = 0;
    const onSubmit = jest.fn(async (_req: AddProductRequestType) => {
      callCount += 1;
      if (callCount === 1) {
        throw Object.assign(new Error('rate_limited'), { code: 'rate_limited' });
      }
      if (callCount === 2) {
        throw Object.assign(new Error('upstream_failed'), { code: 'upstream_failed' });
      }
    });

    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={CATEGORIES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Iaurt editat');
    await fireEvent.changeText(screen.getByTestId('nutrient-sugar'), '4,1');
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurturi` }));

    const saveButton = screen.getByRole('button', { name: ro.review.save });

    // First attempt -> rate_limited
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(ro.errors.rateLimited)).toBeTruthy();
    expect(screen.getByDisplayValue('Iaurt editat')).toBeTruthy();
    expect(screen.getByDisplayValue('4,1')).toBeTruthy();

    // Second attempt -> upstream_failed
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(ro.errors.upstreamFailed)).toBeTruthy();

    // Third attempt -> succeeds with preserved edits
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(3);
    expect(onSubmit.mock.calls[2]?.[0]?.name).toBe('Iaurt editat');
    expect(onSubmit.mock.calls[2]?.[0]?.nutrients.sugar).toBe(4.1);
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

  it('shows recovery actions when opening /add/review route without a valid draft and does not crash or invent data', async () => {
    await render(<ReviewRouteScreen />);

    expect(screen.getByText(ro.errors.generic)).toBeTruthy();
    expect(screen.queryByText(ro.review.title)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: ro.review.retakePhotos }));
    expect(mockReplace).toHaveBeenCalledWith('/add');
  });

  it('renders /add/review route from draftStore, calls api.addProduct on save, and navigates to /product/<id>', async () => {
    setAddReviewDraft({
      initial: BASE_INITIAL,
      label: BASE_LABEL,
      categories: CATEGORIES,
    });
    mockAddProduct.mockResolvedValueOnce(SAVED_LOOKUP);

    await render(<ReviewRouteScreen />);

    expect(screen.getByDisplayValue('Iaurt natural 2,5%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurturi` }));

    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));

    expect(mockAddProduct).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/product/2a7c9e40-1b2c-4d5e-8f90-1234567890ab');
  });
});
