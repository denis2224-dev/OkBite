import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card } from '../../ui';
import { ro } from '../../copy/ro';
export type ReportItem = { id: string; product_id: string; message: string };
export function ReportsList({
  items,
  onClose,
}: {
  items: ReportItem[];
  onClose: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      {items.length ? (
        items.map((item) => (
          <Card key={item.id}>
            <Body>{item.message}</Body>
            <Button
              variant="ghost"
              onPress={() => router.push(`/admin/product/${item.product_id}`)}
            >
              {ro.app.admin.open}
            </Button>
            <Button
              disabled={!!busy}
              onPress={() => {
                setBusy(item.id);
                void onClose(item.id).finally(() => setBusy(null));
              }}
            >
              {ro.app.admin.closeReport}
            </Button>
          </Card>
        ))
      ) : (
        <Body>{ro.app.admin.emptyReports}</Body>
      )}
    </View>
  );
}
