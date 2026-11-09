import { createUnknownDraftRepository } from './unknownDraftRepository';
import { unknownDraftStorage } from './unknownDraftStorage';

export { UnknownDraftSnapshotSchema, type UnknownDraftSnapshot } from './unknownDraftRepository';
export const { loadUnknownDraft, saveUnknownDraft, clearUnknownDraft } =
  createUnknownDraftRepository(unknownDraftStorage);
