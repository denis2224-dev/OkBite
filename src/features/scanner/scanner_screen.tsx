import { TextInput } from "react-native";
import { Heading, Card, Icon, Body, Button } from "../../shared/widgets";
import { useTheme } from "../../core/theme/app_theme";
import { ro } from "../../core/constants/strings_ro";
type Props = {
  code: string;
  setCode: (value: string) => void;
  setError: (value: string) => void;
  findCode: () => void;
  onExample: () => void;
};
export function ScannerScreen({
  code,
  setCode,
  setError,
  findCode,
  onExample,
}: Props) {
  const { colors } = useTheme();
  return (
    <>
      <Heading>{ro.scan.title}</Heading>
      <Card>
        <Icon name="scan" size={50} color={colors.primary} />
        <Body>{ro.scan.webManualOnly}</Body>
        <Body>{ro.scan.manualLabel}</Body>
        <TextInput
          accessibilityLabel={ro.scan.manualLabel}
          keyboardType="number-pad"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, ""));
            setError("");
          }}
          maxLength={13}
          placeholder={ro.scan.manualPlaceholder}
          placeholderTextColor={colors.muted}
          style={{
            minHeight: 54,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 14,
            color: colors.ink,
            fontSize: 18,
          }}
        />
        <Button onPress={findCode}>{ro.scan.submit}</Button>
      </Card>
      <Button variant="secondary" onPress={onExample}>
        {ro.app.preview}
      </Button>
    </>
  );
}
