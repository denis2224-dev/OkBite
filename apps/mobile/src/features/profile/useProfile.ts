import { useEffect, useSyncExternalStore } from 'react';
import { EMPTY_PROFILE, type Profile } from '@okbite/shared';
import { clearProfile, loadProfile, saveProfile } from './store';

type ProfileState = { profile: Profile; hydrated: boolean; error: Error | null };
type ProfileUpdate = Profile | ((previous: Profile) => Profile);

function emptyProfile(): Profile {
  return { ...EMPTY_PROFILE, goals: [], allergens: [], avoid: [] };
}

let state: ProfileState = { profile: emptyProfile(), hydrated: false, error: null };
let hydration: Promise<Profile> | null = null;
let writes: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function publish(update: Partial<ProfileState>) {
  state = { ...state, ...update };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const snapshot = () => state;
const asError = (error: unknown) => error instanceof Error ? error : new Error(String(error));

function hydrate(): Promise<Profile> {
  if (hydration) return hydration;
  hydration = loadProfile().then((profile) => {
    publish({ profile, hydrated: true, error: null });
    return profile;
  }).catch((reason: unknown) => {
    const error = asError(reason);
    publish({ hydrated: false, error });
    throw error;
  }).finally(() => {
    hydration = null;
  });
  return hydration;
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const task = writes.then(async () => {
    // A failed read is recorded in state. Mutations check hydration before writing.
    await hydration?.catch(() => undefined);
    return operation();
  });
  writes = task.catch(() => undefined);
  return task;
}

function setProfile(update: ProfileUpdate): Promise<Profile> {
  return enqueue(async () => {
    if (!state.hydrated) throw state.error ?? new Error('Profile storage is not loaded');
    const previous = state.profile;
    const next = typeof update === 'function' ? update(previous) : update;
    publish({ profile: next, error: null });
    try {
      const profile = await saveProfile(next);
      publish({ profile });
      return profile;
    } catch (reason) {
      const error = asError(reason);
      publish({ profile: previous, error });
      throw error;
    }
  });
}

const resetOnboarding = () => setProfile((profile) => ({ ...profile, onboarded: false }));

function reset(): Promise<void> {
  return enqueue(async () => {
    try {
      await clearProfile();
      publish({ profile: emptyProfile(), hydrated: true, error: null });
    } catch (reason) {
      const error = asError(reason);
      publish({ error });
      throw error;
    }
  });
}

function retryHydration(): Promise<Profile> {
  return enqueue(() => {
    publish({ error: null });
    return hydrate();
  });
}

const clearError = () => publish({ error: null });

/** Reset the module state between isolated tests. */
export function resetProfileHookState(): void {
  hydration = null;
  writes = Promise.resolve();
  publish({ profile: emptyProfile(), hydrated: false, error: null });
}

export function useProfile() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!state.hydrated) void hydrate().catch(() => undefined);
  }, []);
  return { ...current, setProfile, reset, resetOnboarding, retryHydration, clearError };
}
