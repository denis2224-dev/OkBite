import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import type { Goal } from '@okbite/shared';
import { Screen } from '../../ui/Screen';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { Body } from '../../ui/Typography';
import { SoftCard } from '../../ui/SoftCard';
import { GoalPill } from '../../ui/GoalPill';
import { ro } from '../../copy/ro';
import { ProfileSaveError } from './ProfileSaveError';
import { useProfileEditor } from './useProfileEditor';

const goals: readonly Goal[] = ['health', 'allergies', 'family', 'weight', 'other'];

/** Goals only: allergens and "avoid" keys are edited in one place, the Allergies tab. */
export function ProfileScreen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();

  return (
    <Screen title={ro.profile.title}>
      <ProfileSaveError message={errorMessage} retry={retry} />
      <SoftCard testID="goals-card" style={{ gap: 16 }}>
        <Body style={{ fontFamily: fonts.medium, fontSize: 19, lineHeight: 25, color: colors.ink }}>{ro.profile.goalTitle}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {goals.map((goal) => (
            <GoalPill key={goal} text={ro.profile[goal]} selected={profile.goals.includes(goal)} disabled={disabled} onPress={() => toggle('goals', goal)} />
          ))}
        </View>
      </SoftCard>
      {children}
    </Screen>
  );
}
