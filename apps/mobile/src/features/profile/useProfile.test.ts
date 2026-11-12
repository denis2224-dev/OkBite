import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { EMPTY_PROFILE, type Profile } from '@okbite/shared';
import * as store from './store';
import { resetProfileHookState, useProfile } from './useProfile';

jest.mock('./db', () => jest.requireActual('./db.web'));

const existing: Profile = {
  goals: ['health'], allergens: ['Lapte'], avoid: ['palm_oil'], onboarded: true,
};
const later: Profile = { ...existing, goals: ['weight'] };
const failure = new Error('Storage failure');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
}

async function mountReady() {
  const { result } = await renderHook(useProfile);
  await waitFor(() => expect(result.current.hydrated).toBe(true));
  return result;
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await store.clearProfile();
  resetProfileHookState();
});

it('publishes hydration only after the saved profile loads', async () => {
  const read = deferred<Profile>();
  jest.spyOn(store, 'loadProfile').mockReturnValueOnce(read.promise);
  const { result } = await renderHook(useProfile);
  expect(result.current.hydrated).toBe(false);
  await act(async () => { read.resolve(existing); });
  expect(result.current).toMatchObject({ hydrated: true, profile: existing });
});

it('resolves a setProfile call with the saved profile', async () => {
  const result = await mountReady();
  await act(async () => { expect(await result.current.setProfile(existing)).toEqual(existing); });
  expect(result.current.profile).toEqual(existing);
  expect(await store.loadProfile()).toEqual(existing);
});

it('applies functional updates to the current profile', async () => {
  await store.saveProfile(existing);
  const result = await mountReady();
  await act(async () => { await result.current.setProfile((p) => ({ ...p, goals: ['weight'] })); });
  expect(result.current.profile).toEqual(later);
});

it('applies consecutive functional edits in order', async () => {
  const result = await mountReady();
  await act(async () => {
    await Promise.all([
      result.current.setProfile((p) => ({ ...p, goals: ['health'] })),
      result.current.setProfile((p) => ({ ...p, goals: ['allergies'] })),
    ]);
  });
  expect(result.current.profile.goals).toEqual(['allergies']);
});

it('clears a saved profile on full reset', async () => {
  await store.saveProfile(existing);
  const result = await mountReady();
  await act(async () => { await result.current.reset(); });
  expect(result.current).toMatchObject({ profile: EMPTY_PROFILE, hydrated: true });
  expect(await store.loadProfile()).toEqual(EMPTY_PROFILE);
});

it('preserves preferences when restarting onboarding', async () => {
  await store.saveProfile(existing);
  const result = await mountReady();
  await act(async () => { await result.current.resetOnboarding(); });
  expect(result.current.profile).toEqual({ ...existing, onboarded: false });
});

it('shares edits and resets across mounted consumers', async () => {
  const a = await mountReady();
  const b = await mountReady();
  await act(async () => { await a.current.setProfile(existing); });
  expect(b.current.profile).toEqual(existing);
  await act(async () => { await b.current.resetOnboarding(); });
  expect(a.current.profile).toEqual({ ...existing, onboarded: false });
});

it('serializes competing writes so storage contains the last accepted edit', async () => {
  const result = await mountReady();
  const pending = deferred<void>();
  const persist = store.saveProfile;
  const save = jest.spyOn(store, 'saveProfile').mockImplementationOnce(async (profile) => {
    await pending.promise;
    return persist(profile);
  });
  let tasks!: Promise<Profile[]>;
  await act(async () => {
    tasks = Promise.all([result.current.setProfile(existing), result.current.setProfile(later)]);
  });
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(); await tasks; });
  expect(result.current.profile).toEqual(later);
  expect(await store.loadProfile()).toEqual(later);
});

it('restores the last saved profile and exposes a rejected write', async () => {
  await store.saveProfile(existing);
  const result = await mountReady();
  jest.spyOn(store, 'saveProfile').mockRejectedValueOnce(failure);
  await act(async () => { await expect(result.current.setProfile(later)).rejects.toThrow(failure.message); });
  expect(result.current).toMatchObject({ profile: existing, error: failure });
  expect(await store.loadProfile()).toEqual(existing);
});

it('serializes a reset between writes from mounted consumers', async () => {
  await store.saveProfile(existing);
  const a = await mountReady();
  const b = await mountReady();
  const expected: Profile = { ...EMPTY_PROFILE, goals: ['family'], onboarded: true };
  await act(async () => {
    await Promise.all([
      a.current.setProfile(later),
      b.current.reset(),
      a.current.setProfile((p) => ({ ...p, goals: ['family'], onboarded: true })),
    ]);
  });
  for (const consumer of [a, b]) {
    expect(consumer.current).toMatchObject({ profile: expected, hydrated: true });
  }
  expect(await store.loadProfile()).toEqual(expected);
});

it('leaves both consumers hydrated and empty when reset is last in the queue', async () => {
  const a = await mountReady();
  const b = await mountReady();
  await act(async () => { await Promise.all([a.current.setProfile(existing), b.current.reset()]); });
  for (const consumer of [a, b]) {
    expect(consumer.current).toMatchObject({ profile: EMPTY_PROFILE, hydrated: true });
  }
  expect(await store.loadProfile()).toEqual(EMPTY_PROFILE);
});

it('restarts onboarding from the loaded profile without rereading storage', async () => {
  await store.saveProfile(existing);
  const result = await mountReady();
  const load = jest.spyOn(store, 'loadProfile');
  await act(async () => { await result.current.resetOnboarding(); });
  expect(load).not.toHaveBeenCalled();
  expect(result.current.profile).toEqual({ ...existing, onboarded: false });
  expect(await store.loadProfile()).toEqual({ ...existing, onboarded: false });
});

it('blocks writes after a read failure and recovers both mounted consumers on retry', async () => {
  await store.saveProfile(existing);
  const load = jest.spyOn(store, 'loadProfile').mockRejectedValue(failure);
  const { result: a } = await renderHook(useProfile);
  const { result: b } = await renderHook(useProfile);
  await waitFor(() => {
    for (const consumer of [a, b]) {
      expect(consumer.current).toMatchObject({ hydrated: false, error: failure });
    }
  });
  await act(async () => {
    await expect(a.current.setProfile(later)).rejects.toThrow(failure.message);
    await expect(b.current.resetOnboarding()).rejects.toThrow(failure.message);
  });
  load.mockRestore();
  expect(await store.loadProfile()).toEqual(existing);
  await act(async () => { await a.current.retryHydration(); });
  for (const consumer of [a, b]) {
    expect(consumer.current).toMatchObject({ profile: existing, hydrated: true, error: null });
  }
  await act(async () => { await a.current.setProfile((p) => ({ ...p, goals: ['weight'] })); });
  expect(b.current.profile).toEqual(later);
  expect(await store.loadProfile()).toEqual(later);
});
