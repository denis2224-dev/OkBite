import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Body } from '../../ui/Typography';

type Retry = { onPress: () => unknown; busy: boolean } | null;

/** Recoverable error banner for local profile reads and writes. */
export function ProfileSaveError({ message, retry }: { message: string | null; retry: Retry }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <Card style={{ borderColor: colors.low, borderWidth: 1, gap: 8, marginBottom: 8 }}>
      <Body style={{ color: colors.low, fontWeight: '600' }}>{message}</Body>
      {retry && <Button variant="secondary" disabled={retry.busy} onPress={retry.onPress}>{ro.errors.retry}</Button>}
    </Card>
  );
}
