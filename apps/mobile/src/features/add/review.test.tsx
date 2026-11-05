import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { render, fireEvent, screen, act, within } from '@testing-library/react-native';
import {
  AddProductRequest,
  CategoryEntry,
  LookupResponse,
  NUTRIENT_KEYS,
  ReadLabelResponse,
  type AddProductRequest as AddProductRequestType,
  type NutrientKey,
} from '@okbite/shared';
import rawCategoriesJson from '../../../../../data/categories.json';
import { ro } from '../../copy/ro';
import { completeQueued } from '../offline/queue';
import { saveToHistory } from '../history/store';
import { ApiError } from '../../lib/api';
import { parseAddParams } from '../identify/routes';
import ReviewRouteScreen from '../../../app/add/review';
import {
  clearAddReviewDraft,
  getAddReviewDraft,
  getAvailableCategories,
  resetAvailableCategories,
  setAddReviewDraft,
  setAddReviewDraftResult,
  setAvailableCategories,
} from './draftStore';
import { ReviewForm } from './ReviewForm';

const mockReplace = jest.fn<(href: unknown) => void>();
const mockSetQueuedReview = jest.fn<(id: string, res: string) => Promise<void>>(async () => {});
const mockSaveQueuedConfirmation = jest.fn<(id: string, res: string, payload?: string, kind?: string) => Promise<void>>(async () => {});
const mockPutQueued = jest.fn<(item: unknown) => Promise<void>>(async () => {});
jest.mock('../offline/queue', () => ({ completeQueued: jest.fn() }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn(async () => {}) }));
jest.mock('../history/db', () => ({
  putQueued: (item: unknown) => mockPutQueued(item),
  setQueuedReview: (id: string, res: string) => mockSetQueuedReview(id, res),
  saveQueuedConfirmation: (id: string, res: string, payload?: string, kind?: string) => mockSaveQueuedConfirmation(id, res, payload, kind),
}));
const mockAddProduct = jest.fn<(req: AddProductRequestType) => Promise<LookupResponse>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      addProduct: (req: AddProductRequestType) => mockAddProduct(req),
    },
  };
});

const mutableReviewCopy = ro.review as unknown as {
  nutrients?: Partial<Record<NutrientKey, string>>;
};

const REAL_IAURT = CategoryEntry.parse(
  rawCategoriesJson.find((c) => c.slug === 'iaurt'),
);
const REAL_BISCUITI = CategoryEntry.parse(
  rawCategoriesJson.find((c) => c.slug === 'biscuiti'),
);

const BASE_INGREDIENTS =
  'lapte normalizat, culturi lactice vii. Poate conține urme de arahide.';

const BASE_LABEL = ReadLabelResponse.parse({
  ingredientsText: BASE_INGREDIENTS,
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
    category: REAL_IAURT,
    unit: 'g',
    portion: { amount: 100, label: '100 g' },
    nutrients: BASE_LABEL.nutrients,
    ingredientsText: BASE_INGREDIENTS,
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
  // React Native exports View/Text/Pressable/TextInput/ScrollView as lazy getters (~7.2s cold Babel load);
  // warm them in beforeAll so every individual test keeps Jest's strict 5000 ms timeout.
  beforeAll(() => {
    void [View, Text, Pressable, TextInput, ScrollView];
  }, 15_000);

  beforeEach(() => {
    jest.resetAllMocks();
    clearAddReviewDraft();
    resetAvailableCategories();
  });

  afterEach(() => {
    resetAvailableCategories();
  });

  it('loads real categories from data/categories.json validated with C1 before /add/review opens and never duplicates slugs', async () => {
    const catalog = getAvailableCategories();
    expect(catalog.length).toBe(rawCategoriesJson.length);
    expect(new Set(catalog.map((c) => c.slug)).size).toBe(rawCategoriesJson.length);
    for (const entry of catalog) {
      expect(CategoryEntry.safeParse(entry).success).toBe(true);
    }

    // Dedupes duplicate slugs and rejects invalid entries without mutating bundled defaults on reset
    setAvailableCategories([REAL_IAURT, REAL_IAURT, REAL_BISCUITI]);
    expect(getAvailableCategories()).toEqual([REAL_IAURT, REAL_BISCUITI]);

    resetAvailableCategories();
    expect(getAvailableCategories().length).toBe(rawCategoriesJson.length);
  });

  it('blocks saving and shows unavailable state when ro.review.nutrients is missing or partial (never renders unidentified nutrient inputs)', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    const originalNutrients = ro.review.nutrients;
    const categories = getAvailableCategories();

    try {
      // 1. Completely missing nutrient labels
      delete mutableReviewCopy.nutrients;
      const { unmount } = await render(
        <ReviewForm
          label={BASE_LABEL}
          initial={BASE_INITIAL}
          categories={categories}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId('nutrition-copy-unavailable')).toBeTruthy();
      expect(screen.queryByTestId('nutrient-kcal')).toBeNull();
      expect(screen.queryByTestId('nutrient-sugar')).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
      const saveBtnMissing = screen.getByRole('button', { name: ro.review.save });
      expect(saveBtnMissing.props.accessibilityState?.disabled).toBe(true);
      await fireEvent.press(saveBtnMissing);
      expect(onSubmit).not.toHaveBeenCalled();
      await unmount();

      // 2. Partial nutrient labels (missing fruitVegPct)
      const { fruitVegPct: _omitted, ...partialLabels } = originalNutrients;
      mutableReviewCopy.nutrients = partialLabels;
      await render(
        <ReviewForm
          label={BASE_LABEL}
          initial={BASE_INITIAL}
          categories={categories}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId('nutrition-copy-unavailable')).toBeTruthy();
      expect(screen.queryByTestId('nutrient-kcal')).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
      const saveBtnPartial = screen.getByRole('button', { name: ro.review.save });
      expect(saveBtnPartial.props.accessibilityState?.disabled).toBe(true);
      await fireEvent.press(saveBtnPartial);
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      mutableReviewCopy.nutrients = originalNutrients;
    }
  });

  it('renders visible Romanian names and distinct Romanian accessibility labels for every nutrient when labels are complete', async () => {
    const onSubmit = jest.fn<(req: AddProductRequestType) => void>();
    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    const seenA11yLabels = new Set<string>();
    for (const key of NUTRIENT_KEYS) {
      const expectedName = ro.review.nutrients[key];
      expect(screen.getByText(expectedName)).toBeTruthy();
      const input = screen.getByTestId(`nutrient-${key}`);
      const a11yLabel = input.props.accessibilityLabel as string;
      expect(a11yLabel).toContain(expectedName);
      seenA11yLabels.add(a11yLabel);
    }
    expect(seenA11yLabels.size).toBe(NUTRIENT_KEYS.length);

    expect(screen.getByDisplayValue('Iaurt natural 2,5%')).toBeTruthy();
    expect(screen.getByDisplayValue('Livada Verde')).toBeTruthy();
    expect(screen.getByDisplayValue('400 g')).toBeTruthy();
    expect(screen.getByDisplayValue('4840001000014')).toBeTruthy();
    expect(screen.getByDisplayValue(BASE_INGREDIENTS)).toBeTruthy();
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
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Suc` }));
    const saveButton = screen.getByRole('button', { name: ro.review.save });
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(saveButton);
    expect(onSubmit).not.toHaveBeenCalled();

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
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    const allergensBox = within(screen.getByTestId('detected-allergens'));
    expect(allergensBox.getByText('Lapte')).toBeTruthy();
    expect(allergensBox.getByText('Arahide')).toBeTruthy();

    const ingInput = screen.getByLabelText(ro.review.ingredients);
    await fireEvent.changeText(ingInput, 'apă, zahăr, suc de mere');
    expect(allergensBox.getByText(ro.review.allergensNone)).toBeTruthy();
    expect(allergensBox.queryByText('Lapte')).toBeNull();

    await fireEvent.changeText(
      ingInput,
      'făină de grâu, unt de cacao, lecitină din soia. Poate conține: ouă și susan.',
    );
    expect(allergensBox.getByText('Gluten')).toBeTruthy();
    expect(allergensBox.getByText('Soia')).toBeTruthy();
    expect(allergensBox.queryByText('Lapte')).toBeNull();
    expect(allergensBox.getByText('Ouă')).toBeTruthy();
    expect(allergensBox.getByText('Susan')).toBeTruthy();
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
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
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
      ingredientsText: BASE_INGREDIENTS,
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
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));

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
        throw new ApiError('rate_limited');
      }
      if (callCount === 2) {
        throw new ApiError('configuration');
      }
    });

    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Iaurt editat');
    await fireEvent.changeText(screen.getByTestId('nutrient-sugar'), '4,1');
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));

    const saveButton = screen.getByRole('button', { name: ro.review.save });

    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(ro.errors.rate_limited)).toBeTruthy();
    expect(screen.getByDisplayValue('Iaurt editat')).toBeTruthy();
    expect(screen.getByDisplayValue('4,1')).toBeTruthy();

    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(ro.errors.configuration)).toBeTruthy();

    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(3);
    expect(onSubmit.mock.calls[2]?.[0]?.name).toBe('Iaurt editat');
    expect(onSubmit.mock.calls[2]?.[0]?.nutrients.sugar).toBe(4.1);
  });

  it('prevents duplicate submissions and blocks all retake actions (including unclear banner retake) while save is pending', async () => {
    let resolveSubmit!: () => void;
    const onSubmit = jest.fn(
      (_req: AddProductRequestType) =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const onRetake = jest.fn();

    await render(
      <ReviewForm
        label={BASE_LABEL}
        initial={BASE_INITIAL}
        categories={getAvailableCategories()}
        onSubmit={onSubmit}
        onRetake={onRetake}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    const saveButton = screen.getByRole('button', { name: ro.review.save });

    await fireEvent.press(saveButton);
    await fireEvent.press(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // Both retake buttons (unclear banner + footer) must be disabled while save is in flight
    const bannerRetake = screen.getByRole('button', { name: ro.review.retakePhoto });
    const footerRetake = screen.getByRole('button', { name: ro.review.retakePhotos });
    expect(bannerRetake.props.accessibilityState?.disabled).toBe(true);
    expect(footerRetake.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(bannerRetake);
    await fireEvent.press(footerRetake);
    expect(onRetake).not.toHaveBeenCalled();

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

  it('renders /add/review route with zero props, blocks when categories/copy missing, and clears draft after successful save', async () => {
    if (SAVED_LOOKUP.status !== 'found') {
      throw new Error('Expected found LookupResponse fixture');
    }

    setAddReviewDraft({
      initial: { ...BASE_INITIAL, queueId: 'queued-add' },
      label: BASE_LABEL,
    });
    jest.mocked(completeQueued).mockResolvedValue();
    mockAddProduct.mockResolvedValueOnce(SAVED_LOOKUP);

    await render(<ReviewRouteScreen />);

    expect(screen.getByDisplayValue('Iaurt natural 2,5%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));

    expect(mockAddProduct).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${SAVED_LOOKUP.product.id}`);
    expect(getAddReviewDraft()).toBeNull();
    expect(completeQueued).toHaveBeenCalledWith('queued-add');
  });

  it('preserves availableCategories after saving product A so starting product B still has the category catalog', async () => {
    if (SAVED_LOOKUP.status !== 'found') {
      throw new Error('Expected found LookupResponse fixture');
    }

    // Save Product A using bundled categories (no manual setAvailableCategories needed)
    setAddReviewDraft({
      initial: BASE_INITIAL,
      label: BASE_LABEL,
    });
    mockAddProduct.mockResolvedValueOnce(SAVED_LOOKUP);

    const renderA = await render(<ReviewRouteScreen />);
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(getAddReviewDraft()).toBeNull();
    expect(getAvailableCategories().length).toBe(rawCategoriesJson.length);
    await renderA.unmount();

    // Start Product B without reloading categories
    const productBInitial = parseAddParams({
      code: '4840001000021',
      brand: 'Brutăria Veche',
      name: 'Biscuiți de casă',
      quantity: '250 g',
      photoPath: 'uploads/dev-1/front-2.jpg',
    });
    const savedProductB = LookupResponse.parse({
      ...SAVED_LOOKUP,
      product: {
        ...SAVED_LOOKUP.product,
        id: '3b8d0f51-2c3d-4e6f-9a01-234567890abc',
        code: '4840001000021',
        name: 'Biscuiți de casă',
        brand: 'Brutăria Veche',
        quantity: '250 g',
        category: REAL_BISCUITI,
      },
    });
    if (savedProductB.status !== 'found') {
      throw new Error('Expected found LookupResponse fixture for product B');
    }

    setAddReviewDraft({
      initial: productBInitial,
      label: BASE_LABEL,
    });
    mockAddProduct.mockResolvedValueOnce(savedProductB);

    await render(<ReviewRouteScreen />);
    expect(screen.getByDisplayValue('Biscuiți de casă')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Biscuiți` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));

    expect(mockAddProduct).toHaveBeenCalledTimes(2);
    expect(mockAddProduct.mock.calls[1]?.[0]?.categorySlug).toBe('biscuiti');
    expect(mockReplace).toHaveBeenLastCalledWith(`/product/${savedProductB.product.id}`);
  });
  it('retries only local completion when the server saved a product but acknowledgement failed', async () => {
    if (SAVED_LOOKUP.status !== 'found') throw new Error('Expected found fixture');
    setAddReviewDraft({ initial: { ...BASE_INITIAL, queueId: 'ack-failed' }, label: BASE_LABEL });
    mockAddProduct.mockResolvedValueOnce(SAVED_LOOKUP);
    jest.mocked(completeQueued).mockRejectedValueOnce(new Error('database busy')).mockResolvedValueOnce();
    await render(<ReviewRouteScreen />);
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();
    expect(getAddReviewDraft()).not.toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));
    expect(mockAddProduct).toHaveBeenCalledTimes(1);
    expect(completeQueued).toHaveBeenCalledTimes(2);
    expect(saveToHistory).toHaveBeenCalledWith(SAVED_LOOKUP);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${SAVED_LOOKUP.product.id}`);
  });
  it('persists contribution completion independently of history and prevents re-submitting after remount', async () => {
    if (SAVED_LOOKUP.status !== 'found') throw new Error('Expected found fixture');
    setAddReviewDraft({ initial: { ...BASE_INITIAL, queueId: 'queue-receipt-1' }, label: BASE_LABEL });
    mockAddProduct.mockResolvedValueOnce(SAVED_LOOKUP);
    jest.mocked(saveToHistory).mockRejectedValueOnce(new Error('sqlite error')).mockResolvedValueOnce();

    const view = await render(<ReviewRouteScreen />);
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));

    expect(mockSaveQueuedConfirmation).toHaveBeenCalledWith('queue-receipt-1', JSON.stringify(SAVED_LOOKUP), '4840001000014', 'photo');
    expect(jest.mocked(mockSaveQueuedConfirmation).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(saveToHistory).mock.invocationCallOrder[0]!,
    );
    expect(completeQueued).not.toHaveBeenCalled();
    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();

    await view.unmount();
    await render(<ReviewRouteScreen />);

    expect(screen.queryByRole('button', { name: ro.review.save })).toBeNull();
    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));
    expect(mockAddProduct).toHaveBeenCalledTimes(1);
    expect(saveToHistory).toHaveBeenCalledTimes(2);
    expect(completeQueued).toHaveBeenCalledWith('queue-receipt-1');
    expect(mockReplace).toHaveBeenCalledWith(`/product/${SAVED_LOOKUP.product.id}`);
  });

  it('does not mark draft B as saved when response for draft A arrives after active draft switched', async () => {
    if (SAVED_LOOKUP.status !== 'found') throw new Error('Expected found fixture');
    const draftA = { initial: { ...BASE_INITIAL, queueId: 'draft-a' }, label: BASE_LABEL };
    const draftB = { initial: { ...BASE_INITIAL, queueId: 'draft-b' }, label: BASE_LABEL };

    setAddReviewDraft(draftA);
    expect(getAddReviewDraft()?.savedResult).toBeUndefined();

    // Active draft is switched to draft B while request for A is in flight
    setAddReviewDraft(draftB);
    expect(getAddReviewDraft()?.initial.queueId).toBe('draft-b');

    // Response for A arrives with targetDraft = draftA
    setAddReviewDraftResult(SAVED_LOOKUP, draftA);

    // Draft B should NOT have savedResult set!
    expect(getAddReviewDraft()?.savedResult).toBeUndefined();

    // Response for B arrives with targetDraft = draftB
    setAddReviewDraftResult(SAVED_LOOKUP, draftB);
    expect(getAddReviewDraft()?.savedResult).toEqual(SAVED_LOOKUP);
  });

  it('binds entire completion to the initiating draft: preserves draft B and does not navigate when A completes late', async () => {
    if (SAVED_LOOKUP.status !== 'found') throw new Error('Expected found fixture');
    const draftA = { initial: { ...BASE_INITIAL, queueId: 'draft-a' }, label: BASE_LABEL };
    const draftB = { initial: { ...BASE_INITIAL, queueId: 'draft-b', name: 'Produs B' }, label: BASE_LABEL };

    let finishAddA!: (res: LookupResponse) => void;
    const addPromiseA = new Promise<LookupResponse>(resolve => { finishAddA = resolve; });
    mockAddProduct.mockReturnValueOnce(addPromiseA);

    setAddReviewDraft(draftA);
    await render(<ReviewRouteScreen />);

    // Shopper submits draft A
    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Iaurt` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));
    expect(mockAddProduct).toHaveBeenCalledTimes(1);

    // While save for A is in flight, draft B becomes active
    setAddReviewDraft(draftB);
    expect(getAddReviewDraft()?.initial.queueId).toBe('draft-b');

    // A finishes successfully
    await act(async () => {
      finishAddA(SAVED_LOOKUP);
    });

    // Local finalization for A must preserve draft B and leave user on current screen
    expect(getAddReviewDraft()?.initial.queueId).toBe('draft-b');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(saveToHistory).toHaveBeenCalledWith(SAVED_LOOKUP);
    expect(completeQueued).toHaveBeenCalledWith('draft-a');
  });
});
