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
import { useProfile } from '../profile/useProfile';

const fields = ['goals', 'allergens', 'avoid'] as const;
const choices = {
  goals: ['health', 'allergies', 'family', 'weight', 'other'],
  allergens: ALLERGENS,
  avoid: ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'],
} satisfies { [K in (typeof fields)[number]]: readonly Profile[K][number][] };

type Field = (typeof fields)[number];
type ChoiceEdits = Partial<Record<Field, ReadonlyMap<string, boolean>>>;

function applyChoices<T extends string>(
  current: T[],
  available: readonly T[],
  edits?: ReadonlyMap<string, boolean>,
): T[] {
  if (!edits) return current;
  const selected = current.filter((choice) => edits.get(choice) !== false);
  for (const [choice, checked] of edits) {
    const value = available.find((item) => item === choice);
    if (checked && value !== undefined && !selected.includes(value)) selected.push(value);
  }
  return selected;
}

export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, setProfile, hydrated, error, retryHydration } = useProfile();
  const [edits, setEdits] = useState<ChoiceEdits>({});
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const inFlight = useRef(false);
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
      await setProfile((latest) => ({
        ...latest,
        goals: applyChoices(latest.goals, choices.goals, edits.goals),
        allergens: applyChoices(latest.allergens, choices.allergens, edits.allergens),
        avoid: applyChoices(latest.avoid, choices.avoid, edits.avoid),
        onboarded: true,
      }));
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
    setEdits((previous) => {
      const next = new Map(previous[field]);
      const selected: readonly string[] = profile[field];
      next.set(choice, !(next.get(choice) ?? selected.includes(choice)));
      return { ...previous, [field]: next };
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
            const selected = edits[field]?.get(choice) ?? (profile[field] as readonly string[]).includes(choice);
            const label = field === 'allergens' ? ro.allergens[choice as Allergen] : ro.profile[choice as Goal | AvoidKey];
            return (
              <Pressable key={choice} accessibilityRole="checkbox" accessibilityLabel={label}
                accessibilityState={{ checked: selected, disabled: blocked }} disabled={blocked}
                onPress={() => toggle(choice)}
                style={[styles.chip, {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: blocked ? 0.6 : 1,
                }]}>
                <Body style={{ color: selected ? colors.onPrimary : colors.ink, fontWeight: selected ? '700' : '500' }}>
                  {label}
                </Body>
              </Pressable>
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
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
});
