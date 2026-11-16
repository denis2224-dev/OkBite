import { View } from 'react-native';
import { ro } from '../../copy/ro';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { Screen } from '../../ui/Screen';
import { Caption, Section } from '../../ui/Typography';
import { ProfileSaveError } from '../profile/ProfileSaveError';
import { useProfileEditor } from '../profile/useProfileEditor';
import { AllergenChips } from './AllergenChips';
import { AvoidSwitches } from './AvoidSwitches';

/** Alergii tab: allergens and "avoid" keys, saved only on this phone through the shared profile. */
export function AllergiesScreen() {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();
  return (
    <Screen back={false}>
      <View style={{ marginHorizontal: -16, marginTop: -12 }}>
        <TabPageHeader title={ro.allergies.title} subtitle={ro.allergies.lead} />
      </View>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <View style={{ gap: 8 }}>
        <Section>{ro.allergies.allergensLabel}</Section>
        <AllergenChips selected={profile.allergens} disabled={disabled} onToggle={(a) => toggle('allergens', a)} />
      </View>
      <View style={{ gap: 8 }}>
        <Section>{ro.allergies.avoidTitle}</Section>
        <AvoidSwitches selected={profile.avoid} disabled={disabled} onToggle={(k) => toggle('avoid', k)} />
      </View>
      <Caption>{ro.result.missingAllergenNote}</Caption>
    </Screen>
  );
}
