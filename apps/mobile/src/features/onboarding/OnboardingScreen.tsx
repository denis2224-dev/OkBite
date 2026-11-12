import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ALLERGENS, type Allergen, type AvoidKey, type Goal, type Profile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { Body, Heading } from '../../ui/Typography';
import { ToggleChip } from '../allergies/ToggleChip';
import { useProfile } from '../profile/useProfile';

const fields = ['goals', 'allergens', 'avoid'] as const;
const choices = {
  goals: ['health', 'allergies', 'family', 'weight', 'other'],
  allergens: ALLERGENS,
  avoid: ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'],
} satisfies { [K in (typeof fields)[number]]: readonly Profile[K][number][] };

export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, setProfile, hydrated, error, retryHydration } = useProfile();
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const inFlight = useRef(false);
  const draft = editedProfile ?? profile;
  const ready = hydrated;
  const field = fields[step];
  const blocked = !ready || pending;
  const readFailed = !hydrated && (Boolean(error) || pending);
  const title = [ro.onboarding.goalTitle, ro.onboarding.allergensTitle, ro.onboarding.avoidTitle][step];

  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await retryHydration();
    } catch {
      // The profile store publishes the read error to mounted consumers.
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const finish = async () => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setSaveFailed(false);
    try {
      await setProfile({ ...draft, onboarded: true });
      if (onComplete) onComplete();
      else router.replace('/');
    } catch {
      setSaveFailed(true);
      inFlight.current = false;
      setPending(false);
    }
  };

  const toggle = (choice: string) => {
    if (!ready || inFlight.current) return;
    setEditedProfile((previous) => {
      const current = previous ?? profile;
      const selected: readonly string[] = current[field];
      const next = selected.includes(choice) ? selected.filter((item) => item !== choice) : [...selected, choice];
      return { ...current, [field]: next };
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={ro.app.back}
              disabled={blocked} onPress={() => setStep(step === 2 ? 1 : 0)} style={styles.headerAction}>
              <Body style={{ fontWeight: '700' }}>{ro.app.back}</Body>
            </Pressable>
          ) : <View style={{ minWidth: 44 }} />}
          <Body accessibilityRole="header" style={{ color: colors.muted, fontWeight: '700' }}>
            {ro.onboarding.step(step + 1)}
          </Body>
          <Pressable accessibilityRole="button" accessibilityLabel={ro.onboarding.skip}
            accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={finish}
            style={[styles.headerAction, { alignItems: 'flex-end', opacity: blocked ? 0.45 : 1 }]}>
            <Body style={{ color: colors.muted, fontWeight: '700' }}>{ro.onboarding.skip}</Body>
          </Pressable>
        </View>
        {(readFailed || saveFailed) && (
          <View style={[styles.error, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Body style={{ color: colors.low, fontWeight: '600' }}>{ro.errors.generic}</Body>
            {readFailed && <Button variant="secondary" disabled={pending} onPress={retry}>{ro.errors.retry}</Button>}
          </View>
        )}
        <View style={styles.title}>
          <Heading style={{ fontSize: 24, lineHeight: 32 }}>{title}</Heading>
          <Body style={{ color: colors.muted }}>{step === 0 ? ro.onboarding.savedLocally : ro.onboarding.flagNote}</Body>
        </View>
        <ScrollView contentContainerStyle={styles.choices}>
          {ready && choices[field].map((choice) => {
            const selected = (draft[field] as readonly string[]).includes(choice);
            const label = field === 'allergens' ? ro.allergens[choice as Allergen] : ro.profile[choice as Goal | AvoidKey];
            return (
              <ToggleChip key={choice} text={label} selected={selected} disabled={blocked} onPress={() => toggle(choice)} />
            );
          })}
        </ScrollView>
        <View style={{ paddingTop: 8 }}>
          {step === 2 ? (
            <Button disabled={blocked} onPress={finish}>{ro.onboarding.done}</Button>
          ) : (
            <Button disabled={blocked} onPress={() => setStep(step === 0 ? 1 : 2)}>{ro.onboarding.continue}</Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  headerAction: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  error: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  title: { marginTop: 16, marginBottom: 20, gap: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 24 },
});
