import { useRef, useState } from 'react';
import type { Profile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useProfile } from './useProfile';

export type ProfileField = 'goals' | 'allergens' | 'avoid';
type ProfileEdit = { field: ProfileField; choice: string; selected: boolean };

function applyEdit(p: Profile, { field, choice, selected }: ProfileEdit): Profile {
  const list = p[field] as string[];
  const next = list.filter((item) => item !== choice);
  return { ...p, [field]: selected ? [...next, choice] : next };
}

/** The one save and retry path for local profile edits (Profile and Allergies tabs). */
export function useProfileEditor() {
  const { profile, setProfile, hydrated, error, retryHydration } = useProfile();
  const retryingRef = useRef(false);
  const savingRef = useRef(false);
  const [retryingHydration, setRetryingHydration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<ProfileEdit | null>(null);

  const handleRetryHydration = async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetryingHydration(true);
    try {
      await retryHydration();
    } catch {
      // rejection handled, error remains visible
    } finally {
      retryingRef.current = false;
      setRetryingHydration(false);
    }
  };

  // Applies the edit to the latest shared profile, so a retry never overwrites newer changes.
  const saveEdit = async (edit: ProfileEdit) => {
    if (!hydrated || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setPendingEdit(edit);
    try {
      await setProfile((latest) => applyEdit(latest, edit));
      setPendingEdit(null);
      setSaveError(null);
    } catch {
      setSaveError(ro.errors.generic);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const toggle = (field: ProfileField, choice: string) => {
    if (savingRef.current) return;
    setSaveError(null);
    return saveEdit({ field, choice, selected: !(profile[field] as string[]).includes(choice) });
  };
  const showHydrationError = !hydrated && (Boolean(error) || retryingHydration);
  const retry = showHydrationError
    ? { onPress: handleRetryHydration, busy: retryingHydration }
    : pendingEdit ? { onPress: () => saveEdit(pendingEdit), busy: saving } : null;

  return {
    profile,
    toggle,
    disabled: !hydrated || saving,
    errorMessage: showHydrationError ? ro.errors.generic : saveError,
    retry,
  };
}
