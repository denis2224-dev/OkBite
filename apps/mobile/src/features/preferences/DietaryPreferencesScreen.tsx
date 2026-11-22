import { ro } from '../../copy/ro';
import { Screen } from '../../ui/Screen';
import { AvoidSwitches } from '../allergies/AvoidSwitches';
import { ProfileSaveError } from '../profile/ProfileSaveError';
import { useProfileEditor } from '../profile/useProfileEditor';

/** Settings > Dietary preferences: the "avoid" switches, saved only on this phone through the shared profile. */
export function DietaryPreferencesScreen() {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();
  return (
    <Screen title={ro.allergies.dietaryTitle}>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <AvoidSwitches selected={profile.avoid} disabled={disabled} onToggle={(key) => toggle('avoid', key)} />
    </Screen>
  );
}
