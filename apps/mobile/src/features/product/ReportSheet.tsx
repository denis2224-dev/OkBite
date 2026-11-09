import { useRef, useState } from 'react';
import { Modal, View, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Body, Button, Card, Heading, useToast } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { api, ApiError } from '../../lib/api';
import { ro } from '../../copy/ro';

export function ReportSheet({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function submit() {
    if (pending.current) return;
    if (message.trim().length < 3) { setError(ro.result.reportShort); return; }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await api.report({ productId, message: message.trim() });
      toast(ro.result.reportSuccess);
      onClose();
    } catch (e) { setError(e instanceof ApiError ? e.message : ro.errors.generic); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Modal transparent animationType="none" onRequestClose={() => { if (!pending.current) onClose(); }}>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <Heading>{ro.result.report}</Heading><Body>{ro.result.reportHint}</Body>
            <Body>{ro.result.reportLabel}</Body>
            <TextInput accessibilityLabel={ro.result.reportLabel} multiline maxLength={1000} editable={!busy}
              value={message} onChangeText={value => { setMessage(value); setError(''); }}
              style={{ minHeight: 120, padding: 16, fontSize: 16, color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12 }} />
            {!!error && <Body accessibilityLiveRegion="polite" style={{ color: colors.low }}>{error}</Body>}
            <Button disabled={busy} onPress={submit}>{busy ? ro.app.loading : ro.result.reportSend}</Button>
            <Button variant="ghost" disabled={busy} onPress={onClose}>{ro.app.cancel}</Button>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
