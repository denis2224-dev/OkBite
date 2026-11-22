import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import type { Goal } from '@okbite/shared';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Typography';
import { Card } from '../../ui/Card';
import { ro } from '../../copy/ro';
import { ToggleChip } from '../allergies/ToggleChip';
import { ProfileSaveError } from './ProfileSaveError';
import { PreferenceCard } from './PreferenceCard';
import { useProfileEditor } from './useProfileEditor';

const goals: readonly Goal[] = ['health', 'allergies', 'family', 'weight', 'other'];

/** Goals are edited here; dietary and allergen choices are shown here and edited on their Settings pages. */
export function ProfileScreen({ children }: PropsWithChildren) {
  const { profile, toggle, disabled, errorMessage, retry } = useProfileEditor();

  return (
    <Screen title={ro.profile.title}>
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
      <PreferenceCard id="pref-dietary" title={ro.allergies.dietaryTitle} href="/preferences/dietary" items={profile.avoid.map(key => ro.profile[key])} />
      <PreferenceCard id="pref-allergens" title={ro.allergies.allergenPrefsTitle} href="/preferences/allergens" items={profile.allergens.map(name => ro.allergens[name])} />
      {children}
    </Screen>
  );
}
