import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ALLERGENS, type Allergen, type AvoidKey, type Goal, type Profile } from '@okbite/shared';
import { Screen } from '../../ui/Screen';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { useTheme } from '../../theme/useTheme';
import { Body, Heading } from '../../ui/Typography';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ro } from '../../copy/ro';
import { useProfile } from './useProfile';

const fields = ['goals', 'allergens', 'avoid'] as const;
type Field = (typeof fields)[number];
const choices = {
  goals: ['health', 'allergies', 'family', 'weight', 'other'],
  allergens: ALLERGENS,
  avoid: ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'],
} satisfies { [K in Field]: readonly Profile[K][number][] };

type ProfileEdit = { field: Field; choice: string; selected: boolean };

function applyEdit(p: Profile, { field, choice, selected }: ProfileEdit): Profile {
  const list = p[field] as string[];
  const next = list.filter((item) => item !== choice);
  return { ...p, [field]: selected ? [...next, choice] : next };
}
function ProfileChip({
  text,
  selected,
  disabled,
  onPress,
}: {
  text: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={text}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: selected ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Body style={{ color: selected ? colors.onPrimary : colors.ink, fontWeight: selected ? '700' : '500' }}>
        {text}
      </Body>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { profile, setProfile, hydrated, error, retryHydration } = useProfile();
  const { colors } = useTheme();

  const retryingRef = useRef(false);
  const savingRef = useRef(false);
  const [retryingHydration, setRetryingHydration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<ProfileEdit | null>(null);

  const handleRetryHydration = async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetryingHydration(true);
    try {
      await retryHydration();
    } catch {
      // rejection handled, error remains visible
    } finally {
      retryingRef.current = false;
      setRetryingHydration(false);
    }
  };

  // Applies the edit to the latest shared profile, so a retry never overwrites newer changes.
  const saveEdit = async (edit: ProfileEdit) => {
    if (!hydrated || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setPendingEdit(edit);
    try {
      await setProfile((latest) => applyEdit(latest, edit));
      setPendingEdit(null);
      setSaveError(null);
    } catch {
      setSaveError(ro.errors.generic);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const toggle = (field: ProfileEdit['field'], choice: string) => {
    if (savingRef.current) return;
    setSaveError(null);
    return saveEdit({ field, choice, selected: !(profile[field] as string[]).includes(choice) });
  };
  const handleRetrySave = () => {
    if (pendingEdit) return saveEdit(pendingEdit);
  };
  const showHydrationError = !hydrated && (Boolean(error) || retryingHydration);
  const errorMessage = showHydrationError ? ro.errors.generic : saveError;
  const chipsDisabled = !hydrated || saving;
  const titles = { goals: ro.profile.goalTitle, allergens: ro.profile.allergensTitle, avoid: ro.profile.avoidTitle };

  return (
    <Screen title={ro.profile.title} back={false}>
      {/* Saved locally note */}
      <View style={{ marginBottom: 4 }}>
        <Body style={{ color: colors.muted }}>{ro.profile.savedLocally}</Body>
      </View>

      {/* Recoverable Error Banner */}
      {errorMessage && (
        <Card style={{ borderColor: colors.low, borderWidth: 1, gap: 8, marginBottom: 8 }}>
          <Body style={{ color: colors.low, fontWeight: '600' }}>{errorMessage}</Body>
          {showHydrationError ? (
            <Button
              variant="secondary"
              disabled={retryingHydration}
              accessibilityState={{ disabled: retryingHydration }}
              onPress={handleRetryHydration}
            >
              {ro.errors.retry}
            </Button>
          ) : pendingEdit ? (
            <Button
              variant="secondary"
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              onPress={handleRetrySave}
            >
              {ro.errors.retry}
            </Button>
          ) : null}
        </Card>
      )}

      {fields.map((field) => (
        <Card key={field} style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Heading style={{ fontSize: 18 }}>{titles[field]}</Heading>
            {field !== 'goals' && <Body style={{ color: colors.muted }}>{ro.profile.flagNote}</Body>}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {choices[field].map((choice) => (
              <ProfileChip
                key={choice}
                text={field === 'allergens' ? ro.allergens[choice as Allergen] : ro.profile[choice as Goal | AvoidKey]}
                selected={(profile[field] as readonly string[]).includes(choice)}
                disabled={chipsDisabled}
                onPress={() => toggle(field, choice)}
              />
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
