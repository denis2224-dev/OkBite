import { ThemedTextInput as TextInput } from '../../ui/ThemedTextInput';
import { useState } from 'react';
import { View } from 'react-native';
import { NUTRIENT_KEYS, ProductInput } from '@okbite/shared';
import { Body, Button } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';

export function ProductEditor({
  initial,
  onSave,
}: {
  initial: ProductInput;
  onSave: (value: ProductInput) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(initial);
  const [code, setCode] = useState(initial.code ?? '');
  const [values, setValues] = useState(
    Object.fromEntries(
      NUTRIENT_KEYS.map((key) => [key, initial.nutrients[key]?.toString().replace('.', ',') ?? '']),
    ),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (label: string, value: string, change: (text: string) => void, numeric = false) => (
    <View key={label} style={{ gap: 4 }}>
      <Body>{label}</Body>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={change}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        editable={!busy}
        style={{
          minHeight: 48,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.controlBorder,
          color: colors.ink,
        }}
      />
    </View>
  );
  const save = async () => {
    const nutrients = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => {
        const raw = (values[key] ?? '').trim();
        return [
          key,
          raw === '' ? null : /^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(',', '.')) : NaN,
        ];
      }),
    );
    const parsed = ProductInput.safeParse({
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      categorySlug: draft.categorySlug.trim(),
      ingredientsText: draft.ingredientsText.trim(),
      code: code.trim() || null,
      nutrients,
    });
    if (!parsed.success) {
      setError(ro.app.admin.invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(parsed.data);
    } catch {
      setError(ro.app.admin.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      {(['name', 'brand', 'quantity', 'categorySlug', 'ingredientsText'] as const).map((key) =>
        field(
          ro.review[
            key === 'categorySlug' ? 'category' : key === 'ingredientsText' ? 'ingredients' : key
          ],
          draft[key],
          (text) => setDraft({ ...draft, [key]: text }),
        ),
      )}
      {field(ro.scan.manualLabel, code, setCode)}
      {field(ro.app.admin.unit, draft.unit, (unit) =>
        setDraft({ ...draft, unit: unit as ProductInput['unit'] }),
      )}
      {NUTRIENT_KEYS.map((key) =>
        field(
          ro.review.nutrients[key],
          values[key] ?? '',
          (text) => setValues({ ...values, [key]: text }),
          true,
        ),
      )}
      {!!error && <Body accessibilityRole="alert">{error}</Body>}
      <Button disabled={busy} onPress={() => void save()}>
        {ro.app.admin.verify}
      </Button>
    </View>
  );
}
