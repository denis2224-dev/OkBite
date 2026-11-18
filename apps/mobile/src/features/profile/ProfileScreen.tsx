import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import type { Goal } from '@okbite/shared';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Typography';
import { Card } from '../../ui/Card';
import { ro } from '../../copy/ro';
import { ToggleChip } from '../allergies/ToggleChip';
import { ProfileSaveError } from './ProfileSaveError';
import { useProfileEditor } from './useProfileEditor';

const goals: readonly Goal[] = ['health', 'allergies', 'family', 'weight', 'other'];

/** Goals only: allergens and "avoid" keys are edited in one place, the Allergies tab. */
export function ProfileScreen({ children }: PropsWithChildren) {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();

  return (
    <Screen>
      <View style={{ marginHorizontal: -16, marginTop: -12 }}>
        <TabPageHeader title={ro.profile.title} />
      </View>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <Card style={{ gap: 12 }}>
        <Section>{ro.profile.goalTitle}</Section>
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
      {children}
    </Screen>
  );
}
