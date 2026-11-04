import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AddProductRequest,
  NUTRIENT_KEYS,
  Nutrients,
  detectAllergens,
  normalizeCode,
  type AddProductRequest as AddProductRequestType,
  type Category,
  type NutrientKey,
  type Nutrients as NutrientsType,
  type ReadLabelResponse,
  type Unit,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { ActionButton, errorMessage } from '../capture/StatusPanel';
import type { AddInitialValues } from '../identify/routes';
import { CategoryPicker } from './CategoryPicker';
import { NutritionFields, getCompleteNutrientLabels } from './NutritionFields';
import { parseAmount, unitForNutrient } from './parseAmount';

export interface ReviewFormProps {
  label: ReadLabelResponse;
  initial: AddInitialValues;
  categories: readonly Category[];
  onSubmit: (request: AddProductRequestType) => void | Promise<void>;
  onRetake?: (currentIdentity: AddInitialValues) => void;
}

const UNITS: readonly Unit[] = ['g', 'ml'];

function formatInitialNutrient(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

function buildInitialNutrients(n: NutrientsType): Record<NutrientKey, string> {
  return {
    kcal: formatInitialNutrient(n.kcal),
    fat: formatInitialNutrient(n.fat),
    sat: formatInitialNutrient(n.sat),
    sugar: formatInitialNutrient(n.sugar),
    salt: formatInitialNutrient(n.salt),
    protein: formatInitialNutrient(n.protein),
    fiber: formatInitialNutrient(n.fiber),
    fruitVegPct: formatInitialNutrient(n.fruitVegPct),
  };
}

export function ReviewForm({ label, initial, categories, onSubmit, onRetake }: ReviewFormProps) {
  const [name, setName] = useState(initial.name ?? '');
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [quantity, setQuantity] = useState(initial.quantity ?? '');
  const [code, setCode] = useState(initial.code ?? '');
  const [unit, setUnit] = useState<Unit | null>(label.unit);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [ingredientsText, setIngredientsText] = useState(label.ingredientsText ?? '');
  const [nutrientInputs, setNutrientInputs] = useState<Record<NutrientKey, string>>(() =>
    buildInitialNutrients(label.nutrients),
  );
  const [invalidNutrients, setInvalidNutrients] = useState<Partial<Record<NutrientKey, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const detected = useMemo(() => detectAllergens(ingredientsText), [ingredientsText]);
  const nutrientLabels = getCompleteNutrientLabels();
  const hasValidCategory = categorySlug !== null && categories.some((c) => c.slug === categorySlug);
  const canSave =
    !submitting &&
    nutrientLabels !== null &&
    unit !== null &&
    name.trim().length > 0 &&
    brand.trim().length > 0 &&
    ingredientsText.trim().length >= 3 &&
    hasValidCategory;

  const setNutrientField = (key: NutrientKey, value: string) => {
    setNutrientInputs((prev) => ({ ...prev, [key]: value }));
    setInvalidNutrients((prev) => ({ ...prev, [key]: false }));
    setFormError(null);
  };

  const handleRetakePress = () => {
    if (submitting || inFlightRef.current || !onRetake) return;
    const trimmedCode = code.trim();
    const normalizedCode = trimmedCode ? normalizeCode(trimmedCode) : null;
    onRetake({
      code: normalizedCode ?? (trimmedCode || null),
      brand: brand.trim() || null,
      name: name.trim() || null,
      quantity: quantity.trim() || null,
      photoPath: initial.photoPath ? initial.photoPath.trim() || null : null,
    });
  };

  const handleSubmit = async () => {
    if (!canSave || inFlightRef.current || !categorySlug || !unit) return;

    const trimmedCode = code.trim();
    const normalizedCode = trimmedCode ? normalizeCode(trimmedCode) : null;
    if (trimmedCode && !normalizedCode) return setFormError(ro.scan.manualInvalid);

    const parsedNutrients: Record<NutrientKey, number | null> = {
      kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null,
    };
    const nextInvalid: Partial<Record<NutrientKey, boolean>> = {};
    let hasNutrientError = false;

    for (const key of NUTRIENT_KEYS) {
      const raw = nutrientInputs[key].trim();
      if (!raw) continue;
      const parsedVal = parseAmount(raw, unitForNutrient(key));
      if (parsedVal === null || !Nutrients.shape[key].safeParse(parsedVal).success) {
        nextInvalid[key] = true;
        hasNutrientError = true;
      } else {
        parsedNutrients[key] = parsedVal;
      }
    }

    if (hasNutrientError) {
      setInvalidNutrients(nextInvalid);
      return setFormError(ro.errors.generic);
    }
    if (parsedNutrients.sat !== null && parsedNutrients.fat !== null && parsedNutrients.sat > parsedNutrients.fat) {
      return setFormError(ro.review.satOverFat);
    }

    const cleanIngPhoto = label.ingredientsPhotoPath.trim();
    if (!cleanIngPhoto) return setFormError(ro.errors.generic);

    const validated = AddProductRequest.safeParse({
      code: normalizedCode,
      name: name.trim(),
      brand: brand.trim(),
      quantity: quantity.trim(),
      unit,
      categorySlug,
      ingredientsText: ingredientsText.trim(),
      nutrients: parsedNutrients,
      photoPath: initial.photoPath ? initial.photoPath.trim() || null : null,
      ingredientsPhotoPath: cleanIngPhoto,
      nutritionPhotoPath: label.nutritionPhotoPath ? label.nutritionPhotoPath.trim() || null : null,
    });
    if (!validated.success) return setFormError(ro.errors.generic);

    inFlightRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(validated.data);
    } catch (err) {
      const errCode = (err as { code?: string } | null)?.code;
      setFormError(errCode === 'offline' ? ro.offline.subtitle : errorMessage(errCode));
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{ro.review.title}</Text>
      <Text style={styles.hint}>{ro.review.hint}</Text>

      {label.unclear.length > 0 ? (
        <View accessibilityRole="alert" style={styles.unclearBanner}>
          <Text style={styles.unclearBannerTitle}>{ro.review.unclearTitle}</Text>
          <Text style={styles.unclearBannerText}>{ro.review.unclearText}</Text>
          {onRetake ? (
            <ActionButton
              label={ro.review.retakePhoto}
              onPress={handleRetakePress}
              disabled={submitting}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{ro.review.name}</Text>
        <TextInput accessibilityLabel={ro.review.name} value={name} onChangeText={(v) => { setName(v); setFormError(null); }} style={styles.input} />

        <Text style={styles.fieldLabel}>{ro.review.brand}</Text>
        <TextInput accessibilityLabel={ro.review.brand} value={brand} onChangeText={(v) => { setBrand(v); setFormError(null); }} style={styles.input} />

        <Text style={styles.fieldLabel}>{ro.review.quantity}</Text>
        <TextInput accessibilityLabel={ro.review.quantity} value={quantity} onChangeText={(v) => { setQuantity(v); setFormError(null); }} style={styles.input} />

        <Text style={styles.fieldLabel}>{ro.scan.manualTitle}</Text>
        <TextInput testID="input-code" accessibilityLabel={ro.scan.manualTitle} value={code} onChangeText={(v) => { setCode(v); setFormError(null); }} keyboardType="number-pad" style={styles.input} />

        <View style={styles.unitRow}>
          {UNITS.map((u) => {
            const selected = unit === u;
            return (
              <Pressable key={u} accessibilityRole="button" accessibilityLabel={ro.compare.per100(u)} accessibilityState={{ selected }} onPress={() => { setUnit(u); setFormError(null); }} style={[styles.unitButton, selected && styles.unitButtonSelected]}>
                <Text style={[styles.unitText, selected && styles.unitTextSelected]}>{ro.compare.per100(u)}</Text>
              </Pressable>
            );
          })}
        </View>

        <CategoryPicker categories={categories} selectedSlug={categorySlug} onSelect={(slug) => { setCategorySlug(slug); setFormError(null); }} disabled={submitting} />
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{ro.review.ingredients}</Text>
        {label.unclear.includes('ingredientsText') ? (
          <View testID="unclear-ingredientsText">
            <Text style={styles.unclearMark}>{ro.review.unclearField}</Text>
            <Text style={styles.unclearMark}>{ro.review.unreadMark}</Text>
          </View>
        ) : null}
        <TextInput accessibilityLabel={ro.review.ingredients} multiline value={ingredientsText} onChangeText={(v) => { setIngredientsText(v); setFormError(null); }} style={[styles.input, styles.multiline]} />

        <Text style={styles.subLabel}>{ro.review.allergensDetected}</Text>
        {detected.allergens.length === 0 && detected.mayContain.length === 0 ? (
          <Text style={styles.muted}>{ro.review.allergensNone}</Text>
        ) : (
          <View style={styles.chipRow}>
            {detected.allergens.map((alg) => (
              <View key={alg} style={styles.allergenChip}><Text style={styles.allergenChipText}>{alg}</Text></View>
            ))}
            {detected.mayContain.length > 0 ? (
              <View style={styles.chipRow}>
                <Text style={styles.muted}>{ro.result.mayContain}</Text>
                {detected.mayContain.map((alg) => (
                  <View key={`may-${alg}`} style={styles.mayChip}><Text style={styles.mayChipText}>{alg}</Text></View>
                ))}
              </View>
            ) : null}
          </View>
        )}
        <Text style={styles.muted}>{ro.review.allergensHint}</Text>
      </View>

      <NutritionFields values={nutrientInputs} unclear={label.unclear} invalid={invalidNutrients} onChange={setNutrientField} />

      {formError ? <Text accessibilityRole="alert" style={styles.errorBanner}>{formError}</Text> : null}

      <ActionButton label={ro.review.save} onPress={() => { void handleSubmit(); }} disabled={!canSave} />
      {onRetake ? <ActionButton label={ro.review.retakePhotos} onPress={handleRetakePress} disabled={submitting} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: '#F6F1E6' },
  title: { fontSize: 22, fontWeight: '800', color: '#1C2420' },
  hint: { fontSize: 14, color: '#56615A' },
  unclearBanner: { padding: 14, borderRadius: 14, backgroundColor: '#FFF5D9', borderWidth: 1, borderColor: '#E8D29A', gap: 6 },
  unclearBannerTitle: { fontSize: 15, fontWeight: '800', color: '#5A3D00' },
  unclearBannerText: { fontSize: 14, color: '#5A3D00' },
  card: { padding: 14, borderRadius: 16, backgroundColor: '#FFFDF6', gap: 8 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: '#1C2420' },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#56615A', marginTop: 4 },
  unclearMark: { fontSize: 12, fontWeight: '800', color: '#7A4E00' },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#CFC8B8', backgroundColor: '#FFFFFF', color: '#1C2420', fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#CFC8B8', justifyContent: 'center' },
  unitButtonSelected: { backgroundColor: '#173A2A', borderColor: '#173A2A' },
  unitText: { fontSize: 14, fontWeight: '600', color: '#1C2420' },
  unitTextSelected: { color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  allergenChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#5A3D00' },
  allergenChipText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  mayChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#ECE7DA' },
  mayChipText: { fontSize: 13, fontWeight: '600', color: '#3F4842' },
  muted: { fontSize: 13, color: '#56615A' },
  errorBanner: { fontSize: 14, fontWeight: '700', color: '#8E3417' },
});
