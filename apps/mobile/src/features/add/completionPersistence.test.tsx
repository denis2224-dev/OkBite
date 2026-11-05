import React from 'react';
import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ReadLabelResponse } from '@okbite/shared';
import { foundYogurt } from '../../test/fixtures';
import { api } from '../../lib/api';
import * as db from '../history/db';
import { clearHistory, getFromHistory } from '../history/store';
import { flushQueue } from '../offline/queue';
import { ro } from '../../copy/ro';
import { clearAddReviewDraft, setAddReviewDraft, getAddReviewDraft } from './draftStore';
import { ReviewScreen } from './ReviewScreen';

const mockReplace = jest.fn();
let mockBlur = () => {};
const mockRequest = {
  name: foundYogurt.product.name, brand: foundYogurt.product.brand,
  code: foundYogurt.product.code, categorySlug: foundYogurt.product.category.slug,
  unit: foundYogurt.product.unit, ingredientsText: foundYogurt.product.ingredientsText,
  nutrients: foundYogurt.product.nutrients, ingredientsPhotoPath: 'uploads/test/ingredients.jpg',
  nutritionPhotoPath: null,
};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    jest.requireActual<typeof React>('react').useEffect(() => {
      const leave = callback(); mockBlur = leave || (() => {}); return leave;
    }, [callback]);
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn(async (uri: string) => {
    if (!uri.startsWith('file:///owned/')) throw new Error('Expected an owned file URI');
  }),
}));
jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  const connection = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: (string | number)[]) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
    withExclusiveTransactionAsync: async (fn: (value: unknown) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await fn(connection); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { openDatabaseAsync: async () => connection };
});
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: {
  addProduct: jest.fn(), lookup: jest.fn(), identify: jest.fn(),
} }));
// Keep this test at the completion/persistence boundary; form validation has its own suite.
jest.mock('./ReviewForm', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ReviewForm: ({ onSubmit, initial }: { onSubmit: (value: unknown) => Promise<void>; initial: { name: string } }) =>
    ReactActual.createElement(Pressable, { testID: 'submit-contribution', onPress: () => { void onSubmit(mockRequest); } },
      ReactActual.createElement(Text, null, initial.name)) };
});

beforeEach(async () => {
  jest.clearAllMocks();
  await clearHistory();
  for (const row of await db.listQueued()) await db.deleteQueued(row.id);
  jest.mocked(api.addProduct).mockResolvedValue(foundYogurt);
  setAddReviewDraft({
    initial: { code: null, name: foundYogurt.product.name, brand: foundYogurt.product.brand,
      quantity: foundYogurt.product.quantity, photoPath: null },
    label: ReadLabelResponse.parse({ ingredientsText: foundYogurt.product.ingredientsText,
      unit: foundYogurt.product.unit, nutrients: foundYogurt.product.nutrients, unclear: [],
      ingredientsPhotoPath: 'uploads/test/ingredients.jpg', nutritionPhotoPath: null }),
  });
});
afterEach(() => { jest.restoreAllMocks(); clearAddReviewDraft(); });

it('finishes a fresh contribution without claiming ownership of a barcode or UUID photo', async () => {
  await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  expect(api.addProduct).toHaveBeenCalledTimes(1);
  expect(await db.listQueued()).toEqual([]);
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id);
});

it('reuses one completion receipt across history failure and review remount', async () => {
  const confirmations = jest.spyOn(db, 'saveQueuedConfirmation');
  jest.spyOn(db, 'writeHistory').mockRejectedValueOnce(new Error('history busy'));
  const view = await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await screen.findByRole('button', { name: ro.review.finishSave });
  const receipt = (await db.listQueued())[0]!;
  expect(receipt.status).toBe('completed');
  await view.unmount();
  await render(<ReviewScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  expect(confirmations.mock.calls.map(([id]) => id)).toEqual([receipt.id, receipt.id]);
  expect(api.addProduct).toHaveBeenCalledTimes(1);
  expect(await db.listQueued()).toEqual([]);
});

it('ignores another Save while navigation from a completed draft is still pending', async () => {
  await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  // The router is deliberately inert: the old screen can still receive a tap.
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  expect(api.addProduct).toHaveBeenCalledTimes(1);
});

it('recovers a UI-submitted contribution from SQLite after the in-memory draft is lost', async () => {
  jest.spyOn(db, 'writeHistory').mockRejectedValueOnce(new Error('history busy'));
  const view = await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await screen.findByRole('button', { name: ro.review.finishSave });
  await view.unmount();
  clearAddReviewDraft();
  await flushQueue();
  expect(api.addProduct).toHaveBeenCalledTimes(1);
  expect(await db.listQueued()).toEqual([]);
  expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id);
});

it('isolates a retained completion panel from a new draft on the same mounted route', async () => {
  jest.spyOn(db, 'writeHistory').mockRejectedValueOnce(new Error('history busy'));
  const view = await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await screen.findByRole('button', { name: ro.review.finishSave });
  const draftA = getAddReviewDraft()!;
  await db.putQueued({ id: 'draft-b', kind: 'photo', payload: 'file:///owned/b.jpg', createdAt: '2026-11-05T00:00:00Z' });
  await db.markNeedsReview('draft-b', JSON.stringify({ status: 'not_found', read: { brand: null, name: null, quantity: null, code: null }, photoPath: 'test/b.jpg' }));
  setAddReviewDraft({ initial: { ...draftA.initial, queueId: 'draft-b', name: 'Draft B' }, label: draftA.label });
  await view.rerender(<ReviewScreen />);
  expect(screen.queryByRole('button', { name: ro.review.finishSave })).toBeNull();
  expect(screen.getByText('Draft B')).toBeTruthy();
  expect((await db.listQueued()).find(row => row.id === 'draft-b')).toMatchObject({ status: 'needs_review', payload: 'file:///owned/b.jpg' });
});

it.each(['blur', 'unmount'])('finishes durable work without navigating after %s', async mode => {
  let finish!: (value: typeof foundYogurt) => void;
  jest.mocked(api.addProduct).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  if (mode === 'unmount') await view.unmount(); else await act(() => mockBlur());
  await act(() => finish(foundYogurt));
  await waitFor(async () => expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id));
  await waitFor(async () => expect(await db.listQueued()).toEqual([]));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(api.addProduct).toHaveBeenCalledTimes(1);
});
