import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AddProductRequest } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Body } from '../../ui/Typography';

export function GuidedIdentityForm({ onConfirm }: { onConfirm(name: string, quantity: string): Promise<void> }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const saving = useRef(false);
  const valid = Boolean(name.trim() && quantity.trim());

  const confirm = async () => {
    if (saving.current || !valid) return;
    saving.current = true;
    setPending(true);
    setFailed(false);
    try { await onConfirm(name, quantity); }
    catch { setFailed(true); }
    finally { saving.current = false; setPending(false); }
  };

  const inputStyle = { minHeight: 44, borderWidth: 1, borderRadius: radii.small, borderColor: colors.border,
    padding: spacing.md, fontFamily: fonts.body, fontSize: 16, color: colors.ink, backgroundColor: colors.ground };

  return <Card>
    <View style={{ gap: spacing.xs }}>
      <Body>{ro.review.name}</Body>
      <TextInput accessibilityLabel={ro.review.name} value={name} onChangeText={setName}
        maxLength={AddProductRequest.shape.name.maxLength ?? undefined} editable={!pending} style={inputStyle} />
    </View>
    <View style={{ gap: spacing.xs }}>
      <Body>{ro.review.quantity}</Body>
      <TextInput accessibilityLabel={ro.review.quantity} value={quantity} onChangeText={setQuantity}
        maxLength={AddProductRequest.shape.quantity.maxLength ?? undefined} editable={!pending} style={inputStyle} />
    </View>
    {failed ? <Body accessibilityRole="alert" style={{ color: colors.low }}>{ro.add.draftSaveFailed}</Body> : null}
    <Button disabled={!valid || pending} onPress={() => void confirm()}>{ro.add.next}</Button>
  </Card>;
}
