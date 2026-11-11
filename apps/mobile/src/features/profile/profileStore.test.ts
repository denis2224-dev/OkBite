import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EMPTY_PROFILE, type Profile } from '@okbite/shared';
import * as dbModule from './db';
import { loadProfile, saveProfile, clearProfile, resetOnboardingState } from './store';
import { clearHistory, listHistory } from '../history/store';

jest.mock('./db', () => jest.requireActual('./db.web'));
jest.mock('../history/db', () => jest.requireActual('../history/db.web'));

describe('profileStore (local persistence)', () => {
  beforeEach(async () => {
    await clearProfile();
  });

  it('loads fresh EMPTY_PROFILE when storage is empty', async () => {
    const profile = await loadProfile();
    expect(profile).toEqual(EMPTY_PROFILE);
    expect(profile).not.toBe(EMPTY_PROFILE); // immutable copy
  });

  it('loads fresh EMPTY_PROFILE when stored json is corrupt or invalid', async () => {
    const { writeProfile } = jest.requireActual<typeof import('./db.web')>('./db.web');
    await writeProfile('not-valid-json{{{');
    expect(await loadProfile()).toEqual(EMPTY_PROFILE);

    await writeProfile(JSON.stringify({ goals: ['invalid_goal'], allergens: [], avoid: [], onboarded: true }));
    expect(await loadProfile()).toEqual(EMPTY_PROFILE);
  });

  it('persists a valid profile round-trip across reloads', async () => {
    const custom: Profile = {
      goals: ['health', 'allergies'],
      allergens: ['Lapte', 'Gluten'],
      avoid: ['palm_oil', 'added_sugar'],
      onboarded: true,
    };
    await saveProfile(custom);
    const loaded = await loadProfile();
    expect(loaded).toEqual(custom);
  });

  it('never mutates EMPTY_PROFILE default arrays', async () => {
    const original = JSON.parse(JSON.stringify(EMPTY_PROFILE));
    const loaded = await loadProfile();
    loaded.goals.push('weight');
    expect(EMPTY_PROFILE.goals).toEqual(original.goals);
    expect(EMPTY_PROFILE.goals).toHaveLength(0);
  });

  it('resetOnboardingState sets onboarded to false while preserving preferences', async () => {
    const custom: Profile = {
      goals: ['family'],
      allergens: ['Soia'],
      avoid: ['sweeteners'],
      onboarded: true,
    };
    await saveProfile(custom);
    const updated = await resetOnboardingState();
    expect(updated).toEqual({
      goals: ['family'],
      allergens: ['Soia'],
      avoid: ['sweeteners'],
      onboarded: false,
    });
    expect(await loadProfile()).toEqual(updated);
  });

  it('clearing history leaves profile intact and clearing profile leaves history intact', async () => {
    const custom: Profile = {
      goals: ['health'],
      allergens: ['Arahide'],
      avoid: ['colourings'],
      onboarded: true,
    };
    await saveProfile(custom);
    await clearHistory();
    expect(await loadProfile()).toEqual(custom);

    await clearProfile();
    expect(await loadProfile()).toEqual(EMPTY_PROFILE);
    expect(await listHistory()).toEqual([]);
  });

  it('never makes network requests during profile load or save', async () => {
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await loadProfile();
    await saveProfile({ goals: ['health'], allergens: [], avoid: [], onboarded: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('distinguishes a failed storage read from missing or malformed data and rejects without overwriting', async () => {
    // 1. Missing data -> returns EMPTY_PROFILE
    jest.spyOn(dbModule, 'readProfile').mockResolvedValueOnce(null);
    const empty = await loadProfile();
    expect(empty).toEqual(EMPTY_PROFILE);

    // 2. Malformed JSON -> returns EMPTY_PROFILE
    jest.spyOn(dbModule, 'readProfile').mockResolvedValueOnce('{ corrupt: json');
    const corrupt = await loadProfile();
    expect(corrupt).toEqual(EMPTY_PROFILE);

    // 3. Storage read failure -> throws error, does NOT return EMPTY_PROFILE
    jest.spyOn(dbModule, 'readProfile').mockRejectedValueOnce(new Error('Disk I/O failure'));
    await expect(loadProfile()).rejects.toThrow('Disk I/O failure');

    // 4. resetOnboardingState on read failure must NOT overwrite with empty profile
    const writeSpy = jest.spyOn(dbModule, 'writeProfile');
    jest.spyOn(dbModule, 'readProfile').mockRejectedValueOnce(new Error('SQLite busy'));
    await expect(resetOnboardingState()).rejects.toThrow('SQLite busy');
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
