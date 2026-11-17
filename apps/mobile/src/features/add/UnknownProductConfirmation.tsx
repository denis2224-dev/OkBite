import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { detectAllergens, emptyWaterProfile, inferFrontWaterMeta, NUTRIENT_KEYS, Nutrients, WATER_NUMERIC_KEYS, type AddProductRequest, type Category, type ReadLabelResponse, type Unit, type WaterProfile } from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { Screen } from '../../ui/Screen';
import { AllergenChip } from '../../ui/AllergenChip';
import { ActionButton } from '../capture/StatusPanel';
import { GuidedAddProgress } from './GuidedAddProgress';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { CategoryPicker } from './CategoryPicker';
import { parseAmount, unitForNutrient } from './parseAmount';
import { UnknownConfirmationField } from './UnknownConfirmationField';
import { UnknownConfirmationPhoto } from './UnknownConfirmationPhoto';
import { getUnclearLabelFields } from './labelWarnings';
import { WaterFields } from './WaterFields';

export type UnknownProductProposal = Omit<AddProductRequest, 'unit' | 'categorySlug'> & { unit: Unit | null; categorySlug?: string; water?: WaterProfile | null };
export type UnknownPhotoKind = 'front' | 'ingredients' | 'nutrition';
export interface UnknownProductConfirmationProps {
  initial: AddInitialValues & { frontPhotoId?: string; categorySlug?: string };
  label: Omit<ReadLabelResponse, 'reasons'> & { reasons?: Partial<Record<string, string>> | null };
  photos: Record<UnknownPhotoKind, string | null>;
  categories: readonly Category[];
  onConfirm(proposal: UnknownProductProposal): Promise<void>;
  onChange?(proposal: UnknownProductProposal): void;
  onRetake(kind: UnknownPhotoKind): void;
  onManual?(): void;
  onReadWaterFromPhoto?(): Promise<WaterProfile | null | void>;
}

const isWaterProfileEmpty = (w: WaterProfile | null | undefined): boolean =>
  !w || WATER_NUMERIC_KEYS.every(key => w[key] === null || w[key] === undefined);

export function UnknownProductConfirmation({ initial, label, photos, categories, onConfirm, onChange, onRetake, onManual, onReadWaterFromPhoto }: UnknownProductConfirmationProps) {
  const { colors } = useTheme();
  const inferred = inferFrontWaterMeta({
    brand: initial.brand,
    name: initial.name,
    isWater: Boolean(initial.isWater || initial.categorySlug === 'apa' || label.water != null),
    carbonation: initial.carbonation ?? label.water?.carbonation ?? null,
  });
  const initialWater = initial.categorySlug ? initial.categorySlug === 'apa' || label.water != null : inferred.isWater;
  const [value, setValue] = useState<UnknownProductProposal>(() => {
    const baseWater = label.water ?? emptyWaterProfile();
    const seededWater =
      initialWater && baseWater.carbonation === null && inferred.carbonation
        ? { ...baseWater, carbonation: inferred.carbonation }
        : baseWater;
    return {
      ...(initial.categorySlug ? { categorySlug: initial.categorySlug } : initialWater ? { categorySlug: 'apa' } : {}),
      code: initial.code, name: initial.name ?? '', brand: initial.brand ?? '', quantity: initial.quantity ?? '',
      photoPath: initial.photoPath, ingredientsText: label.ingredientsText ?? '', unit: label.unit ?? (initialWater ? 'ml' : null),
      nutrients: { ...label.nutrients },
      ...(initialWater ? { water: seededWater } : {}),
      ingredientsPhotoPath: label.ingredientsPhotoPath, nutritionPhotoPath: label.nutritionPhotoPath,
    };
  });
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [waterInvalid, setWaterInvalid] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [waterReading, setWaterReading] = useState(false);
  const [waterReadError, setWaterReadError] = useState(false);
  const [waterVersion, setWaterVersion] = useState(0);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const change = (next: UnknownProductProposal) => { setValue(next); setError(false); onChange?.(next); };
  const isWaterMode = value.categorySlug === 'apa' || value.water != null;
  const unclear = getUnclearLabelFields(label);
  const nutritionUnreadable = !isWaterMode && unclear.some(key => key !== 'ingredientsText');
  const visibleNutrients = NUTRIENT_KEYS.filter(key => label.nutrients[key] !== null);
  const essentialMissing = !isWaterMode && !value.ingredientsText.trim();
  const { allergens, mayContain } = detectAllergens(value.ingredientsText);
  const numericInvalid = Object.values(invalid).some(Boolean) || (isWaterMode && waterInvalid) ||
    (value.nutrients.sat !== null && value.nutrients.fat !== null && value.nutrients.sat > value.nutrients.fat);
  // U1 option A: unit is required on save, so ask g/ml with one tap instead of guessing it.
  const canConfirm = !pending && !numericInvalid && value.unit !== null && value.name.trim().length > 0 && value.name.trim().length <= 120 &&
    value.brand.trim().length <= 80 && value.quantity.trim().length <= 30 &&
    (isWaterMode ? value.ingredientsText.trim().length <= 3000 : value.ingredientsText.trim().length >= 3 && value.ingredientsText.trim().length <= 3000);
  const submit = async () => {
    if (busy.current || !canConfirm) return;
    busy.current = true; setPending(true); setError(false);
    try { await onConfirm({ ...value, name: value.name.trim(), brand: value.brand.trim(), quantity: value.quantity.trim(), ingredientsText: value.ingredientsText.trim() }); }
    catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  };
  const textStyle = { color: colors.ink, fontSize: 16 };
  const card = { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface };
  const photoLabels = { front: ro.app.admin.front, ingredients: ro.app.admin.ingredientsPhoto, nutrition: ro.app.admin.nutritionPhoto };
  const field = (key: 'name' | 'brand' | 'quantity' | 'ingredientsText', title: string) =>
    <UnknownConfirmationField label={title} value={value[key]} disabled={pending} multiline={key === 'ingredientsText'}
      onChange={text => change({ ...value, [key]: text })} />;
  return <Screen title={ro.add.confirmTitle}>
    <GuidedAddProgress step={4} total={4} />
    <Text style={{ color: colors.muted, fontSize: 16 }}>{ro.add.tapToEdit}</Text>
    <View style={[card, { flexDirection: 'row', flexWrap: 'wrap' }]}>
      {(['front', 'ingredients', 'nutrition'] as const).map(kind => <UnknownConfirmationPhoto key={kind}
        id={photos[kind] ?? (kind === 'front' ? initial.frontPhotoId ?? null : null)} label={photoLabels[kind]}
        disabled={pending} onRetake={() => onRetake(kind)} />)}
    </View>
    <View style={card}>
      {field('name', ro.review.name)}{field('brand', ro.review.brand)}{field('quantity', ro.review.quantity)}
      {!value.name.trim() ? <>
        <Text style={textStyle}>{ro.add.identityMissing}</Text>
        <ActionButton label={`${ro.add.retakePhoto}: ${ro.review.name}`} onPress={() => onRetake('front')} disabled={pending} />
      </> : null}
      <ActionButton label={`${ro.add.categoryOptional}: ${categories.find(category => category.slug === value.categorySlug)?.name ?? ro.add.unknownCategory}`}
        disabled={pending} onPress={() => setCategoryOpen(!categoryOpen)} />
      {categoryOpen ? <CategoryPicker categories={categories} selectedSlug={value.categorySlug ?? null} disabled={pending}
        onSelect={categorySlug => {
          const nextIsWater = categorySlug === 'apa';
          const baseNextWater = value.water ?? emptyWaterProfile();
          const nextWater =
            nextIsWater && baseNextWater.carbonation === null && inferred.carbonation
              ? { ...baseNextWater, carbonation: inferred.carbonation }
              : baseNextWater;
          change({
            ...value, categorySlug,
            unit: nextIsWater ? (value.unit ?? 'ml') : value.unit,
            water: nextIsWater ? nextWater : undefined,
          });
          setCategoryOpen(false);
        }} /> : null}
    </View>
    <View style={card}>
      {field('ingredientsText', ro.review.ingredients)}
      {essentialMissing || (!isWaterMode && unclear.includes('ingredientsText')) ? <>
        <Text style={textStyle}>{ro.add.unreadableText}</Text>
        <ActionButton label={`${ro.add.retakePhoto}: ${ro.review.ingredients}`} onPress={() => onRetake('ingredients')} disabled={pending} />
      </> : null}
      {onManual && (essentialMissing || label.reasons?.ingredientsText === 'failed') ?
        <ActionButton label={ro.add.manualEntry} onPress={onManual} disabled={pending} /> : null}
      {allergens.length > 0 && <>
        <Text accessibilityRole="header" style={textStyle}>{ro.result.allergens}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allergens.map(name => <AllergenChip key={name} name={name} />)}
        </View>
      </>}
      {mayContain.length > 0 && <>
        <Text accessibilityRole="header" style={textStyle}>{ro.result.mayContain}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {mayContain.map(name => <AllergenChip key={name} name={name} tone="trace" />)}
        </View>
      </>}
      <Text style={textStyle}>{ro.result.missingAllergenNote}</Text>
    </View>
    {isWaterMode ? (
      <View style={{ gap: 12 }}>
        {onReadWaterFromPhoto && photos.ingredients && isWaterProfileEmpty(value.water) ? (
          <View style={card}>
            <ActionButton
              label={waterReading ? ro.add.reading : ro.add.readWaterFromPhoto}
              disabled={pending || waterReading}
              onPress={() => {
                if (waterReading || pending) return;
                setWaterReading(true);
                setWaterReadError(false);
                void onReadWaterFromPhoto()
                  .then(extracted => {
                    if (extracted) {
                      const nextCarbonation =
                        extracted.carbonation ?? value.water?.carbonation ?? inferred.carbonation ?? null;
                      const mergedWater: WaterProfile = { ...extracted, carbonation: nextCarbonation };
                      change({
                        ...value,
                        categorySlug: 'apa',
                        unit: value.unit ?? 'ml',
                        water: mergedWater,
                      });
                      setWaterInvalid(false);
                      setWaterVersion(v => v + 1);
                    }
                  })
                  .catch(() => setWaterReadError(true))
                  .finally(() => setWaterReading(false));
              }}
            />
            {waterReadError ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{ro.add.processingFailed}</Text> : null}
          </View>
        ) : null}
        <WaterFields
          key={`water-${waterVersion}`}
          value={value.water ?? emptyWaterProfile()}
          disabled={pending || waterReading}
          onChange={water => change({ ...value, water })}
          onInvalidChange={setWaterInvalid}
        />
      </View>
    ) : (
      <View style={card}>
        <Text accessibilityRole="header" style={textStyle}>{ro.review.nutritionTitle}</Text>
        {visibleNutrients.length > 0 ? <>
          <Pressable accessibilityRole="button" accessibilityLabel={ro.review.per100} disabled={pending}
            accessibilityState={{ disabled: pending }} onPress={() => setUnitOpen(!unitOpen)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={textStyle}>{value.unit === 'g' ? ro.add.basisGram : value.unit === 'ml' ? ro.add.basisMl : ro.result.undeclared}</Text>
          </Pressable>
          {unitOpen ? (['g', 'ml'] as const).map(unit => <ActionButton key={unit} label={ro.compare.per100(unit)} disabled={pending}
            onPress={() => { change({ ...value, unit }); setUnitOpen(false); }} />) : null}
          {visibleNutrients.map(key => {
            const amount = value.nutrients[key];
            return <UnknownConfirmationField key={key} label={ro.review.nutrients[key]} disabled={pending} numeric invalid={invalid[key]}
              value={amount === null ? '' : `${String(amount).replace('.', ',')} ${unitForNutrient(key)}`} onChange={text => {
                const amount = text.trim() ? parseAmount(text, unitForNutrient(key)) : null;
                const valid = !text.trim() || (amount !== null && Nutrients.shape[key].safeParse(amount).success);
                setInvalid(previous => ({ ...previous, [key]: !valid }));
                if (valid) change({ ...value, nutrients: { ...value.nutrients, [key]: amount } });
              }} />;
          })}
        </> : <><Text style={textStyle}>{ro.add.ingredientsOnly}</Text><Text style={textStyle}>{ro.add.nutritionUnavailable}</Text></>}
        {visibleNutrients.length === 0 || value.unit === null ? <>
          <Text style={textStyle}>{ro.add.unitQuestion}</Text>
          {(['g', 'ml'] as const).map(unit => <ActionButton key={unit} label={unit === 'g' ? ro.add.unitGram : ro.add.unitMl}
            variant={value.unit === unit ? 'primary' : undefined} disabled={pending} onPress={() => change({ ...value, unit })} />)}
        </> : null}
        {nutritionUnreadable ? <>
          <Text style={textStyle}>{ro.add.nutritionUnreadable}</Text>
          <ActionButton label={`${ro.add.retakePhoto}: ${ro.review.nutritionTitle}`} onPress={() => onRetake('nutrition')} disabled={pending} />
        </> : null}
        {numericInvalid ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{ro.errors.bad_request}</Text> : null}
      </View>
    )}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{ro.add.saveFailed}</Text> : null}
    <ActionButton label={pending ? ro.add.savePending : ro.add.confirmSave} onPress={() => { void submit(); }} disabled={!canConfirm} variant="primary" />
  </Screen>;
}
