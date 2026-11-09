import { createUnknownDraftRepository, type UnknownDraftStorage } from './unknownDraftRepository';

const draft = {
  version: 1 as const, id: 'draft-a',
  initial: { code: null, brand: null, name: null, quantity: null, photoPath: null,
    frontPhotoId: 'front-photo-id' },
  stage: 'review' as const, nutritionMode: 'none' as const,
  photos: { front: 'front-photo-id', ingredients: 'ingredients-photo-id', nutrition: null },
  label: { ingredientsText: null, unit: null,
    nutrients: { kcal: null, fat: null, sat: null, sugar: null, salt: null,
      protein: null, fiber: null, fruitVegPct: null }, unclear: [],
    ingredientsPhotoPath: 'uploads/ingredients.jpg', nutritionPhotoPath: null,
    missingReasons: { kcal: 'not_visible' } },
  readStatus: 'complete' as const,
};

function memoryStorage(initial: string | null = null): UnknownDraftStorage {
  let value = initial;
  return {
    async read() { return value; },
    async write(next) { value = next; },
    async remove() { value = null; },
  };
}

it('restores photos, null nutrients and future label reasons after a new repository loads', async () => {
  const storage = memoryStorage();
  await createUnknownDraftRepository(storage).saveUnknownDraft(draft);
  const restored = await createUnknownDraftRepository(storage).loadUnknownDraft();
  expect(restored).toEqual(draft);
});

it('restores an in-flight read as interrupted for explicit retry', async () => {
  const storage = memoryStorage(JSON.stringify({ ...draft, stage: 'reading', readStatus: 'pending' }));
  const restored = await createUnknownDraftRepository(storage).loadUnknownDraft();
  expect(restored?.readStatus).toBe('interrupted');
  expect(restored?.stage).toBe('reading');
  expect(restored?.label?.nutrients.kcal).toBeNull();
});

it('waits for a pending write before clearing so the draft cannot return', async () => {
  const storage = memoryStorage();
  let release!: () => void;
  let started!: () => void;
  const writing = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const write = storage.write;
  storage.write = async value => { started(); await gate; await write(value); };
  const repository = createUnknownDraftRepository(storage);
  const saving = repository.saveUnknownDraft(draft);
  await writing;
  const clearing = repository.clearUnknownDraft(draft.id);
  release();
  await Promise.all([saving, clearing]);
  expect(await createUnknownDraftRepository(storage).loadUnknownDraft()).toBeNull();
});

it('does not let cleanup of an old draft delete its newer replacement', async () => {
  const repository = createUnknownDraftRepository(memoryStorage());
  await repository.saveUnknownDraft({ ...draft, id: 'draft-b' });
  await repository.clearUnknownDraft('draft-a');
  expect((await repository.loadUnknownDraft())?.id).toBe('draft-b');
});

it.each(['{broken', JSON.stringify({ ...draft, version: 2 }),
  JSON.stringify({ ...draft, readStatus: 'unknown' })])('ignores invalid stored data without deleting it', async raw => {
  const storage = memoryStorage(raw);
  const repository = createUnknownDraftRepository(storage);
  expect(await repository.loadUnknownDraft()).toBeNull();
  await repository.clearUnknownDraft('draft-a');
  expect(await storage.read()).toBe(raw);
});

it.each(['blob:temporary', 'data:image/jpeg;base64,cGhvdG8='])('rejects transient photo references: %s', async photo => {
  const repository = createUnknownDraftRepository(memoryStorage());
  await expect(repository.saveUnknownDraft({ ...draft, photos: { ...draft.photos, front: photo } })).rejects.toThrow();
  expect(await repository.loadUnknownDraft()).toBeNull();
});

it('allows retry after storage fails without dropping later saves', async () => {
  const storage = memoryStorage();
  const write = storage.write;
  let fail = true;
  storage.write = async value => { if (fail) { fail = false; throw new Error('full'); } await write(value); };
  const repository = createUnknownDraftRepository(storage);
  await expect(repository.saveUnknownDraft(draft)).rejects.toThrow('full');
  await repository.saveUnknownDraft(draft);
  expect((await repository.loadUnknownDraft())?.id).toBe('draft-a');
});

it('restores a shopper-selected category without inventing a default', async () => {
  const storage = memoryStorage();
  await createUnknownDraftRepository(storage).saveUnknownDraft({ ...draft, initial: { ...draft.initial, categorySlug: 'test-category' } });
  expect((await createUnknownDraftRepository(storage).loadUnknownDraft())?.initial.categorySlug).toBe('test-category');
});

it('rejects an old draft update queued behind a newer pending write', async () => {
  const storage = memoryStorage(JSON.stringify(draft));
  let release!: () => void;
  let started!: () => void;
  const writing = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const write = storage.write;
  storage.write = async json => { started(); await gate; await write(json); };
  const repository = createUnknownDraftRepository(storage);
  const newer = repository.saveUnknownDraft({ ...draft, id: 'draft-b' });
  await writing;
  const stale = repository.saveUnknownDraftIfCurrent({ ...draft, readStatus: 'interrupted' });
  release();
  await newer;
  expect(await stale).toBe(false);
  expect((await repository.loadUnknownDraft())?.id).toBe('draft-b');
});

it('conditionally saves a matching draft and reports that it was committed', async () => {
  const repository = createUnknownDraftRepository(memoryStorage(JSON.stringify(draft)));
  expect(await repository.saveUnknownDraftIfCurrent({ ...draft, stage: 'ingredients', readStatus: 'idle' })).toBe(true);
  expect((await repository.loadUnknownDraft())?.stage).toBe('ingredients');
});
