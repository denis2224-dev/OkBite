import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { NUTRIENT_KEYS, Nutrients, type AddProductRequest, type Category, type ReadLabelResponse, type Unit } from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { Screen } from '../../ui/Screen';
import { ActionButton } from '../capture/StatusPanel';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { CategoryPicker } from './CategoryPicker';
import { parseAmount, unitForNutrient } from './parseAmount';
import { UnknownConfirmationField } from './UnknownConfirmationField';
import { UnknownConfirmationPhoto } from './UnknownConfirmationPhoto';

export type UnknownProductProposal = Omit<AddProductRequest, 'unit' | 'categorySlug'> & { unit: Unit | null; categorySlug?: string };
export type UnknownPhotoKind = 'front' | 'ingredients' | 'nutrition';
export interface UnknownProductConfirmationProps {
  initial: AddInitialValues & { frontPhotoId?: string; categorySlug?: string };
  label: ReadLabelResponse & { reasons?: Record<string, string> | null };
  photos: Record<UnknownPhotoKind, string | null>;
  categories: readonly Category[];
  onConfirm(proposal: UnknownProductProposal): Promise<void>;
  onChange?(proposal: UnknownProductProposal): void;
  onRetake(kind: UnknownPhotoKind): void;
  onManual?(): void;
}

export function UnknownProductConfirmation({ initial, label, photos, categories, onConfirm, onChange, onRetake, onManual }: UnknownProductConfirmationProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState<UnknownProductProposal>(() => ({
    ...(initial.categorySlug ? { categorySlug: initial.categorySlug } : {}),
    code: initial.code, name: initial.name ?? '', brand: initial.brand ?? '', quantity: initial.quantity ?? '',
    photoPath: initial.photoPath, ingredientsText: label.ingredientsText ?? '', unit: label.unit,
    nutrients: { ...label.nutrients }, ingredientsPhotoPath: label.ingredientsPhotoPath, nutritionPhotoPath: label.nutritionPhotoPath,
  }));
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const change = (next: UnknownProductProposal) => { setValue(next); setError(false); onChange?.(next); };
  const unreadable = (field: string) => label.reasons?.[field] === 'unreadable' ||
    (!label.reasons?.[field] && label.unclear.includes(field as ReadLabelResponse['unclear'][number]));
  const nutritionUnreadable = NUTRIENT_KEYS.some(unreadable);
  const visibleNutrients = NUTRIENT_KEYS.filter(key => label.nutrients[key] !== null);
  const essentialMissing = !value.ingredientsText.trim();
  const numericInvalid = Object.values(invalid).some(Boolean) ||
    (value.nutrients.sat !== null && value.nutrients.fat !== null && value.nutrients.sat > value.nutrients.fat);
  const canConfirm = !pending && !numericInvalid && value.name.trim().length > 0 && value.name.trim().length <= 120 &&
    value.brand.trim().length <= 80 && value.quantity.trim().length <= 30 && value.ingredientsText.trim().length >= 3 && value.ingredientsText.trim().length <= 3000;
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
  return <Screen title={ro.add.confirmTitle} back={false}>
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
        onSelect={categorySlug => { change({ ...value, categorySlug }); setCategoryOpen(false); }} /> : null}
    </View>
    <View style={card}>
      {field('ingredientsText', ro.review.ingredients)}
      {essentialMissing || unreadable('ingredientsText') ? <>
        <Text style={textStyle}>{ro.add.unreadableText}</Text>
        <ActionButton label={`${ro.add.retakePhoto}: ${ro.review.ingredients}`} onPress={() => onRetake('ingredients')} disabled={pending} />
      </> : null}
      {onManual && (essentialMissing || label.reasons?.ingredientsText === 'processing_failed') ?
        <ActionButton label={ro.add.manualEntry} onPress={onManual} disabled={pending} /> : null}
    </View>
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
          return <UnknownConfirmationField key={key} label={ro.review.nutrients[key]} disabled={pending} numeric
            value={amount === null ? '' : `${String(amount).replace('.', ',')} ${unitForNutrient(key)}`} onChange={text => {
              const amount = text.trim() ? parseAmount(text, unitForNutrient(key)) : null;
              const valid = !text.trim() || (amount !== null && Nutrients.shape[key].safeParse(amount).success);
              setInvalid(previous => ({ ...previous, [key]: !valid }));
              if (valid) change({ ...value, nutrients: { ...value.nutrients, [key]: amount } });
            }} />;
        })}
      </> : <><Text style={textStyle}>{ro.add.ingredientsOnly}</Text><Text style={textStyle}>{ro.add.nutritionUnavailable}</Text></>}
      {nutritionUnreadable ? <>
        <Text style={textStyle}>{ro.add.nutritionUnreadable}</Text>
        <ActionButton label={`${ro.add.retakePhoto}: ${ro.review.nutritionTitle}`} onPress={() => onRetake('nutrition')} disabled={pending} />
      </> : null}
      {numericInvalid ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{ro.errors.bad_request}</Text> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{ro.add.saveFailed}</Text> : null}
    <ActionButton label={pending ? ro.add.savePending : ro.add.confirmSave} onPress={() => { void submit(); }} disabled={!canConfirm} variant="primary" />
  </Screen>;
}
