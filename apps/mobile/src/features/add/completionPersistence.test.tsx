import React from 'react';
import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import { render, fireEvent, screen } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ReadLabelResponse } from '@okbite/shared';
import { foundYogurt } from '../../test/fixtures';
import { api } from '../../lib/api';
import * as db from '../history/db';
import { clearHistory, getFromHistory } from '../history/store';
import { flushQueue } from '../offline/queue';
import { ro } from '../../copy/ro';
import { clearAddReviewDraft, setAddReviewDraft } from './draftStore';
import { ReviewScreen } from './ReviewScreen';

const mockReplace = jest.fn();
const mockRequest = {
  name: foundYogurt.product.name, brand: foundYogurt.product.brand,
  code: foundYogurt.product.code, categorySlug: foundYogurt.product.category.slug,
  unit: foundYogurt.product.unit, ingredientsText: foundYogurt.product.ingredientsText,
  nutrients: foundYogurt.product.nutrients, ingredientsPhotoPath: 'uploads/test/ingredients.jpg',
  nutritionPhotoPath: null,
};
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
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
  return { ReviewForm: ({ onSubmit }: { onSubmit: (value: unknown) => Promise<void> }) =>
    ReactActual.createElement(Pressable, { testID: 'submit-contribution', onPress: () => onSubmit(mockRequest) },
      ReactActual.createElement(Text, null, 'submit')) };
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
  const receipt = (await db.listQueued())[0]!;
  expect(receipt.status).toBe('completed');
  await view.unmount();
  await render(<ReviewScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));
  expect(confirmations.mock.calls.map(([id]) => id)).toEqual([receipt.id, receipt.id]);
  expect(api.addProduct).toHaveBeenCalledTimes(1);
  expect(await db.listQueued()).toEqual([]);
});

it('recovers a UI-submitted contribution from SQLite after the in-memory draft is lost', async () => {
  jest.spyOn(db, 'writeHistory').mockRejectedValueOnce(new Error('history busy'));
  const view = await render(<ReviewScreen />);
  await fireEvent.press(screen.getByTestId('submit-contribution'));
  await view.unmount();
  clearAddReviewDraft();
  await flushQueue();
  expect(api.addProduct).toHaveBeenCalledTimes(1);
  expect(await db.listQueued()).toEqual([]);
  expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id);
});
