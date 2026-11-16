import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Copy } from '../../copy/ro';
import { en } from '../../copy/strings.en';
import { roStrings } from '../../copy/strings.ro';
import { NotFound } from '../identify/NotFound';
import { GuidedAddScreen } from './GuidedAddScreen';
import type { GuidedFlowState } from './guidedFlowTypes';
import { useGuidedAddSession } from './useGuidedAddSession';

let mockCopy: Copy;
jest.mock('../../copy/ro', () => ({ get ro() { return mockCopy; } }));
jest.mock('expo-router', () => ({ useRouter: () => ({}), useLocalSearchParams: () => ({}) }));
jest.mock('./useGuidedAddSession', () => ({ useGuidedAddSession: jest.fn() }));
jest.mock('./GuidedPhotoCapture', () => jest.requireActual('./GuidedPhotoCapture.web'));

const initial = { code: null, name: null, brand: null, quantity: null, photoPath: null };
const stages = [['front', 1], ['ingredients', 2], ['nutrition', 3]] as const;

function showStage(stage: GuidedFlowState['stage'], photoPath: string | null = null) {
  const controller = {} as NonNullable<ReturnType<typeof useGuidedAddSession>['controller']>;
  jest.mocked(useGuidedAddSession).mockReturnValue({
    controller,
    draftId: 'draft',
    state: {
      stage, initial, initialFrontRead: initial, scannedCode: null, remotePhotoPath: photoPath,
      photos: { front: null, ingredients: null, nutrition: null }, nutritionMode: null, label: null,
    },
    error: null, restoredFromDraft: false, draftConflict: false, discardError: false, frontPending: 'none',
    resumeDraft: jest.fn(), discardDraft: jest.fn(),
  });
  return render(<GuidedAddScreen />);
}

describe.each([['Romanian', roStrings], ['English', en]] as const)('%s guided add', (_language, copy) => {
  beforeEach(() => { mockCopy = copy; });

  test.each(stages)('announces the %s photo step and names its actions', async (stage, step) => {
    await showStage(stage);
    const counter = copy.add.stepOf(step, 4);
    expect(screen.getByText(counter)).toBeVisible();
    expect(screen.getByRole('progressbar', { name: counter })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.capture.shutter })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.add.gallery })).toBeVisible();
  });

  test('names all four nutrition options', async () => {
    await showStage('nutrition_question');
    expect(screen.getByRole('progressbar', { name: copy.add.stepOf(3, 4) })).toBeVisible();
    for (const option of [copy.add.nutritionYes, copy.add.nutritionSame, copy.add.nutritionNone, copy.add.nutritionSkip]) {
      expect(screen.getByRole('button', { name: option })).toBeVisible();
    }
  });

  test('announces label reading', async () => {
    await showStage('working', 'front.jpg');
    expect(screen.getByText(copy.add.reading)).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  test('keeps front-photo progress while identifying the package', async () => {
    await showStage('working');
    expect(screen.getByRole('progressbar', { name: copy.add.stepOf(1, 4) })).toBeVisible();
    expect(screen.getByText(copy.add.readingFront)).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  test('names the unknown-product actions', async () => {
    await render(<NotFound code="4840001000014" onAdd={jest.fn()} onCheckCodeAgain={jest.fn()} />);
    expect(screen.getByRole('button', { name: copy.identify.addButton })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.identify.checkCodeAgain })).toBeVisible();
  });

  test('explains front capture and optional nutrition before guided add', async () => {
    await render(<NotFound code="4840001000014" onAdd={jest.fn()} guided={{ needsFrontPhoto: true }} />);
    expect(screen.getByText(copy.add.frontTitle)).toBeVisible();
    expect(screen.getByText(copy.add.nutritionSkip)).toBeVisible();
  });
});
