import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ALLERGENS, type Allergen, type AvoidKey, type Goal, type Profile } from '@okbite/shared';
import { getLanguage, languageSelectable, setLanguage as persistLanguage, type Language } from '../../copy/lang';
import { ro } from '../../copy/ro';
import { ScreenSafeArea as SafeAreaView } from '../../shared/ScreenSafeArea';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { IconButton } from '../../ui/IconButton';
import { Body, Heading } from '../../ui/Typography';
import { ToggleChip } from '../allergies/ToggleChip';
import { useProfile } from '../profile/useProfile';

const languages: readonly Language[] = ['ro', 'ru', 'en'];
const fields = ['goals', 'allergens', 'avoid'] as const;
const choices = {
  goals: ['health', 'allergies', 'family', 'weight', 'other'],
  allergens: ALLERGENS,
  avoid: ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'],
} satisfies { [K in (typeof fields)[number]]: readonly Profile[K][number][] };

type Field = (typeof fields)[number];
type Step = 0 | 1 | 2 | 3;
type ChoiceEdits = Partial<Record<Field, ReadonlyMap<string, boolean>>>;
type OnboardingProps = {
  onComplete?: () => void;
  currentLanguage?: Language;
  setLanguage?: (language: Language) => void;
};

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

export function OnboardingScreen({
  onComplete,
  currentLanguage = getLanguage(),
  setLanguage = languageSelectable ? persistLanguage : undefined,
}: OnboardingProps = {}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, setProfile, hydrated, error, retryHydration } = useProfile();
  const [edits, setEdits] = useState<ChoiceEdits>({});
  const [step, setStep] = useState<Step>(0);
  const [pending, setPending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [languageFailed, setLanguageFailed] = useState(false);
  const inFlight = useRef(false);
  const ready = hydrated;
  const field = step > 0 ? fields[step - 1] : null;
  const blocked = !ready || pending;
  const readFailed = !hydrated && (Boolean(error) || pending);
  const title = [ro.onboarding.languageTitle, ro.onboarding.goalTitle, ro.onboarding.allergensTitle, ro.onboarding.avoidTitle][step];
  const languageNames: Record<Language, string> = { ro: ro.settings.romanian, ru: ro.settings.russian, en: ro.settings.english };

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

  const selectLanguage = (language: Language) => {
    if (blocked || !setLanguage || language === currentLanguage) return;
    try {
      setLanguageFailed(false);
      setLanguage(language);
    } catch {
      setLanguageFailed(true);
    }
  };

  const toggle = (choice: string) => {
    if (!field || !ready || inFlight.current) return;
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
            <IconButton icon="back" label={ro.app.back} disabled={blocked} onPress={() => setStep((step - 1) as Step)} />
          ) : <View style={{ minWidth: 44 }} />}
          <Body accessibilityRole="header" style={{ color: colors.muted, fontWeight: '700' }}>
            {ro.onboarding.step(step + 1)}
          </Body>
          <Button variant="ghost" disabled={blocked} onPress={finish} style={styles.skip}>{ro.onboarding.skip}</Button>
        </View>
        {(readFailed || saveFailed || languageFailed) && (
          <Card style={styles.error}>
            <Body style={{ color: colors.low, fontWeight: '600' }}>{ro.errors.generic}</Body>
            {readFailed && <Button variant="secondary" disabled={pending} onPress={retry}>{ro.errors.retry}</Button>}
          </Card>
        )}
        <View style={styles.title}>
          <Heading style={{ fontSize: 24, lineHeight: 32 }}>{title}</Heading>
          {step >= 2 && <Body style={{ color: colors.muted }}>{ro.onboarding.flagNote}</Body>}
        </View>
        <ScrollView contentContainerStyle={styles.choices}>
          {ready && !field && (
            <>
              {languages.map((language) => (
                <ToggleChip key={language} role="button" text={languageNames[language]}
                  selected={currentLanguage === language} disabled={blocked || !setLanguage}
                  onPress={() => selectLanguage(language)} />
              ))}
              {!setLanguage && <Body style={{ color: colors.muted, width: '100%' }}>{ro.settings.pending}</Body>}
            </>
          )}
          {ready && field && choices[field].map((choice) => {
            const selected = edits[field]?.get(choice) ?? (profile[field] as readonly string[]).includes(choice);
            const label = field === 'allergens' ? ro.allergens[choice as Allergen] : ro.profile[choice as Goal | AvoidKey];
            return (
              <ToggleChip key={choice} text={label} selected={selected} disabled={blocked} onPress={() => toggle(choice)} />
            );
          })}
        </ScrollView>
        <View style={{ paddingTop: 8, gap: 8 }}>
          {step === 3 ? (
            <Button disabled={blocked} onPress={finish}>{ro.onboarding.done}</Button>
          ) : (
            <Button disabled={blocked} onPress={() => setStep((step + 1) as Step)}>{ro.onboarding.continue}</Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  skip: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 12 },
  error: { marginTop: 12, padding: 12, gap: 8 },
  title: { marginTop: 16, marginBottom: 20, gap: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 24 },
});
