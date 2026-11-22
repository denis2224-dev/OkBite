import { useState } from 'react';
import { Image, View } from 'react-native';
import { emptyWaterProfile, WATER_NUMERIC_KEYS, type WaterSubmission } from '@okbite/shared';
import { Body, Button, Card } from '../../ui';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { waterFieldDisplayValue, waterFieldLabel } from '../product/waterFormat';

/** Moderation list for water label submissions (conflicts & edits on verified bottles). */
export function WaterSubmissionsList({
  items,
  onResolve,
}: {
  items: WaterSubmission[];
  onResolve: (id: string, decision: 'accept' | 'reject') => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const copy = ro.app.admin;
  if (!items.length) return <Body>{copy.emptyWaterSubmissions}</Body>;

  return (
    <View style={{ gap: 12 }}>
      {items.map((item) => {
        const cur = item.currentWater ? { ...emptyWaterProfile(), ...item.currentWater } : emptyWaterProfile();
        const prop = { ...emptyWaterProfile(), ...item.proposedWater };
        const diffRows: { label: string; current: string; proposed: string }[] = [];

        if (item.proposedWater.carbonation) {
          diffRows.push({
            label: ro.result.water.carbonationLabel,
            current: cur.carbonation ? ro.result.water.carbonation[cur.carbonation] : '—',
            proposed: ro.result.water.carbonation[item.proposedWater.carbonation],
          });
        }
        if (item.proposedWater.classification) {
          diffRows.push({
            label: ro.result.water.classificationLabel,
            current: cur.classification ? ro.result.water.classifications[cur.classification] : '—',
            proposed: ro.result.water.classifications[item.proposedWater.classification],
          });
        }
        for (const key of WATER_NUMERIC_KEYS) {
          const propVal = waterFieldDisplayValue(prop, key);
          if (propVal !== null) {
            diffRows.push({
              label: waterFieldLabel(key),
              current: waterFieldDisplayValue(cur, key) ?? '—',
              proposed: propVal,
            });
          }
        }

        const kindLabel = copy.waterKinds[item.kind];
        return (
          <Card key={item.id} style={{ gap: 8 }}>
            <Body style={{ fontFamily: fonts.bold }}>{`${item.productBrand}, ${item.productName}${item.productQuantity ? ` (${item.productQuantity})` : ''}`}</Body>
            <Body>{`${kindLabel}, ${item.createdAt}`}</Body>
            {item.photoUrl && (
              <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="contain" />
            )}
            {diffRows.map((row) => (
              <View key={row.label} style={{ gap: 2 }}>
                <Body style={{ fontFamily: fonts.bold }}>{row.label}</Body>
                <Body>{`${copy.currentReading}: ${row.current} → ${copy.proposedReading}: ${row.proposed}`}</Body>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                disabled={!!busy}
                onPress={() => {
                  setBusy(item.id);
                  void onResolve(item.id, 'accept').finally(() => setBusy(null));
                }}
              >
                {copy.acceptSubmission}
              </Button>
              <Button
                variant="secondary"
                disabled={!!busy}
                onPress={() => {
                  setBusy(item.id);
                  void onResolve(item.id, 'reject').finally(() => setBusy(null));
                }}
              >
                {copy.rejectSubmission}
              </Button>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
