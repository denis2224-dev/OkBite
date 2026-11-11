import { z } from 'zod';
import { Allergen, EMPTY_PROFILE, type Profile } from '@okbite/shared';
import { readProfile, writeProfile, deleteProfile } from './db';

const GoalEnum = z.enum(['health', 'allergies', 'family', 'weight', 'other']);
const AvoidKeyEnum = z.enum(['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil']);

export const ProfileSchema = z.object({
  goals: z.array(GoalEnum),
  allergens: z.array(Allergen),
  avoid: z.array(AvoidKeyEnum),
  onboarded: z.boolean(),
});

function freshProfile(source?: Profile): Profile {
  return {
    goals: [...(source?.goals ?? EMPTY_PROFILE.goals)],
    allergens: [...(source?.allergens ?? EMPTY_PROFILE.allergens)],
    avoid: [...(source?.avoid ?? EMPTY_PROFILE.avoid)],
    onboarded: source?.onboarded ?? EMPTY_PROFILE.onboarded,
  };
}

export async function loadProfile(): Promise<Profile> {
  const raw = await readProfile();
  if (!raw) return freshProfile();
  try {
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? freshProfile(parsed.data) : freshProfile();
  } catch {
    return freshProfile();
  }
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const valid = ProfileSchema.parse(profile);
  await writeProfile(JSON.stringify(valid));
  return freshProfile(valid);
}

export async function resetOnboardingState(): Promise<Profile> {
  const current = await loadProfile();
  current.onboarded = false;
  return saveProfile(current);
}

export async function clearProfile(): Promise<void> {
  await deleteProfile();
}
