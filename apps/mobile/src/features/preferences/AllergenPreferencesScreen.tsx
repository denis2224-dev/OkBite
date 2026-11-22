import { ro } from '../../copy/ro';
import { Screen } from '../../ui/Screen';
import { AllergenChips } from '../allergies/AllergenChips';
import { ProfileSaveError } from '../profile/ProfileSaveError';
import { useProfileEditor } from '../profile/useProfileEditor';

/** Settings > Allergen preferences: the regulated allergens, saved only on this phone through the shared profile. */
export function AllergenPreferencesScreen() {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();
  return (
    <Screen title={ro.allergies.allergenPrefsTitle}>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <AllergenChips selected={profile.allergens} disabled={disabled} onToggle={(allergen) => toggle('allergens', allergen)} />
    </Screen>
  );
}
