import { View } from 'react-native';
import { ro } from '../../copy/ro';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { Screen } from '../../ui/Screen';
import { Caption } from '../../ui/Typography';
import { SoftCard } from '../../ui/SoftCard';
import { ProfileSaveError } from '../profile/ProfileSaveError';
import { useProfileEditor } from '../profile/useProfileEditor';
import { AllergenChips } from './AllergenChips';
import { AvoidSwitches } from './AvoidSwitches';

/** Alergii tab: allergens and "avoid" keys, saved only on this phone through the shared profile. */
export function AllergiesScreen() {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();
  return (
    <Screen>
      <View style={{ marginHorizontal: -16, marginTop: -12 }}>
        <TabPageHeader title={ro.allergies.title} />
      </View>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <SoftCard testID="allergen-card">
        <AllergenChips selected={profile.allergens} disabled={disabled} onToggle={(a) => toggle('allergens', a)} />
      </SoftCard>
      <SoftCard testID="avoid-card" style={{ paddingVertical: 4, gap: 0 }}>
        <AvoidSwitches selected={profile.avoid} disabled={disabled} onToggle={(k) => toggle('avoid', k)} />
      </SoftCard>
      <Caption style={{ textAlign: 'center' }}>{ro.result.missingAllergenNote}</Caption>
    </Screen>
  );
}
