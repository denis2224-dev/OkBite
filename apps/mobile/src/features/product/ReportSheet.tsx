import { useState } from "react";
import {
  Modal,
  View,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Card, Heading, Body, Button, useToast } from "../../ui";
import { useTheme } from "../../theme/useTheme";
import { ro } from "../../copy/ro";
import { api, ApiError } from "../../lib/api";
import { isPreview } from "../../lib/preview";
export function ReportSheet({
  productId,
  visible,
  onClose,
}: {
  productId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme(),
    toast = useToast();
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    if (message.trim().length < 3) {
      setError(ro.result.reportShort);
      return;
    }
    setBusy(true);
    try {
      await api.report({ productId, message: message.trim() });
      setMessage("");
      onClose();
      toast(ro.result.reportSuccess);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : ro.errors.generic);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: colors.scrim,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        >
          <View
            accessibilityViewIsModal
            style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}
          >
            <Card>
              <Heading>{ro.result.report}</Heading>
              <Body>
                {isPreview ? ro.result.demoReport : ro.result.reportHint}
              </Body>
              <Body>{ro.result.reportLabel}</Body>
              <TextInput
                accessibilityLabel={ro.result.reportLabel}
                multiline
                maxLength={1000}
                value={message}
                onChangeText={(v) => {
                  setMessage(v);
                  setError("");
                }}
                style={{
                  minHeight: 120,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  color: colors.ink,
                  fontSize: 16,
                  textAlignVertical: "top",
                }}
              />
              {!!error && (
                <Body
                  accessibilityLiveRegion="polite"
                  style={{ color: colors.low }}
                >
                  {error}
                </Body>
              )}
              <Button disabled={busy || isPreview} onPress={submit}>
                {busy ? ro.app.loading : ro.result.reportSend}
              </Button>
              <Button variant="ghost" onPress={onClose}>
                {ro.app.cancel}
              </Button>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
