import { completeUnknownDraft } from './completeUnknownDraft';
import { loadUnknownDraft, saveUnknownDraft, clearUnknownDraft } from './unknownDraft';
import { saveToHistory } from '../history/store';
import { saveQueuedConfirmation } from '../history/db';
import { completeQueued } from '../offline/queue';
import { removePhoto } from '../offline/photos';
import { lookupFound } from '../capture/__fixtures__/responses';
import type { UnknownDraftSnapshot } from './unknownDraft';
jest.mock('./unknownDraft', () => ({ loadUnknownDraft: jest.fn(), saveUnknownDraft: jest.fn(), clearUnknownDraft: jest.fn() }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn() }));
jest.mock('../history/db', () => ({ saveQueuedConfirmation: jest.fn() }));
jest.mock('../offline/queue', () => ({ completeQueued: jest.fn() }));
jest.mock('../offline/photos', () => ({ removePhoto: jest.fn() }));
const draft = { id: 'draft-id', initial: { queueId: undefined }, photos: { front: 'f', ingredients: 'i', nutrition: 'i' } } as UnknownDraftSnapshot;
beforeEach(() => { jest.resetAllMocks(); jest.mocked(loadUnknownDraft).mockResolvedValueOnce(draft).mockResolvedValue(null); jest.mocked(removePhoto).mockResolvedValue(); });
test('persists a known saved result before history and only then clears the draft', async () => {
  await completeUnknownDraft(draft, lookupFound);
  expect(saveUnknownDraft).toHaveBeenCalledWith({ ...draft, savedResult: lookupFound });
  expect(saveQueuedConfirmation).toHaveBeenCalledWith('draft-id', JSON.stringify(lookupFound));
  expect(saveToHistory).toHaveBeenCalledWith(lookupFound);
  expect(completeQueued).toHaveBeenCalledWith('draft-id');
  expect(clearUnknownDraft).toHaveBeenCalledWith('draft-id');
  expect(jest.mocked(removePhoto).mock.calls).toEqual([['f'], ['i']]);
  expect(jest.mocked(saveToHistory).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(clearUnknownDraft).mock.invocationCallOrder[0]!);
});
test('retains the draft when local completion fails', async () => {
  jest.mocked(saveToHistory).mockRejectedValueOnce(new Error('storage'));
  await expect(completeUnknownDraft(draft, lookupFound)).rejects.toThrow('storage');
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
});
test('never overwrites or removes photos belonging to a newer draft', async () => {
  const newer = { ...draft, id: 'newer' };
  jest.mocked(loadUnknownDraft).mockReset().mockResolvedValue(newer);
  await completeUnknownDraft(draft, lookupFound);
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
});
test('does not clear work for a not-found response', async () => {
  await expect(completeUnknownDraft(draft, { status: 'not_found' })).rejects.toMatchObject({ code: 'invalid_response' });
  expect(clearUnknownDraft).not.toHaveBeenCalled();
});
