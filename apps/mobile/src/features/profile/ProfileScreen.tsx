import { View } from 'react-native';
import type { Goal } from '@okbite/shared';
import { Screen } from '../../ui/Screen';
import { useTheme } from '../../theme/useTheme';
import { Body, Heading } from '../../ui/Typography';
import { Card } from '../../ui/Card';
import { ro } from '../../copy/ro';
import { ToggleChip } from '../allergies/ToggleChip';
import { ProfileSaveError } from './ProfileSaveError';
import { useProfileEditor } from './useProfileEditor';

const goals: readonly Goal[] = ['health', 'allergies', 'family', 'weight', 'other'];

/** Goals only: allergens and "avoid" keys are edited in one place, the Allergies tab. */
export function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();

  return (
    <Screen title={ro.profile.title} back={false}>
      <View style={{ marginBottom: 4 }}>
        <Body style={{ color: colors.muted }}>{ro.profile.savedLocally}</Body>
      </View>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <Card style={{ gap: 12 }}>
        <Heading style={{ fontSize: 18 }}>{ro.profile.goalTitle}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {goals.map((goal) => (
            <ToggleChip
              key={goal}
              text={ro.profile[goal]}
              selected={profile.goals.includes(goal)}
              disabled={disabled}
              onPress={() => toggle('goals', goal)}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}
