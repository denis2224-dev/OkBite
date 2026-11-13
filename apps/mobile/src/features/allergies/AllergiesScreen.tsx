import { View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Screen } from '../../ui/Screen';
import { Body, Heading } from '../../ui/Typography';
import { ProfileSaveError } from '../profile/ProfileSaveError';
import { useProfileEditor } from '../profile/useProfileEditor';
import { AllergenChips } from './AllergenChips';
import { AvoidSwitches } from './AvoidSwitches';

/** Alergii tab: allergens and "avoid" keys, saved only on this phone through the shared profile. */
export function AllergiesScreen() {
  const { colors } = useTheme();
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();
  return (
    <Screen back={false}>
      <View style={{ gap: 8 }}>
        <Heading style={{ fontSize: 30, lineHeight: 36 }}>{ro.allergies.title}</Heading>
        <Body style={{ color: colors.muted }}>{`${ro.allergies.lead} ${ro.profile.savedLocally}.`}</Body>
      </View>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <AllergenChips selected={profile.allergens} disabled={disabled} onToggle={(a) => toggle('allergens', a)} />
      <View style={{ gap: 8 }}>
        <Heading style={{ fontSize: 18, lineHeight: 24 }}>{ro.allergies.avoidTitle}</Heading>
        <AvoidSwitches selected={profile.avoid} disabled={disabled} onToggle={(k) => toggle('avoid', k)} />
      </View>
      <Body style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{ro.result.missingAllergenNote}</Body>
    </Screen>
  );
}
