import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Screen, Heading, Body, Button } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { AdminGate } from '../../src/features/admin/AdminGate';
import type { WaterSubmission } from '@okbite/shared';
import { getAdminClient, readWaterSubmissions, sendModeration } from '../../src/features/admin/client';
import { UnverifiedList, type UnverifiedItem } from '../../src/features/admin/UnverifiedList';
import { ReportsList, type ReportItem } from '../../src/features/admin/ReportsList';
import { WaterSubmissionsList } from '../../src/features/admin/WaterSubmissionsList';
function Dashboard() {
  const [products, setProducts] = useState<UnverifiedItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [waterSubmissions, setWaterSubmissions] = useState<WaterSubmission[]>([]);
  const [error, setError] = useState('');
  const [db] = useState(getAdminClient);
  const reload = useCallback(
    () =>
      Promise.all([
        db
          .from('products')
          .select('id,name,brand')
          .eq('status', 'unverified')
          .order('added_at', { ascending: false })
          .limit(100),
        db
          .from('reports')
          .select('id,product_id,message')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(100),
        readWaterSubmissions(),
      ])
        .then(([p, r, w]) => {
          if (p.error || r.error) throw new Error();
          setProducts(p.data);
          setReports(r.data);
          setWaterSubmissions(w);
          setError('');
        })
        .catch(() => setError(ro.app.admin.failed)),
    [db],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  const close = async (id: string) => {
    try {
      await sendModeration({ action: 'close_report', reportId: id });
      await reload();
    } catch {
      setError(ro.app.admin.failed);
    }
  };
  const resolveWater = async (submissionId: string, decision: 'accept' | 'reject') => {
    try {
      await sendModeration({ action: 'resolve_water_submission', submissionId, decision });
      await reload();
    } catch {
      setError(ro.app.admin.failed);
    }
  };
  return (
    <>
      {!!error && <Body accessibilityRole="alert">{error}</Body>}
      <Button variant="ghost" onPress={() => void reload()}>
        {ro.app.admin.reload}
      </Button>
      <Heading>{ro.app.admin.unverified}</Heading>
      <UnverifiedList items={products} onOpen={(id) => router.push(`/admin/product/${id}`)} />
      <Heading>{ro.app.admin.reports}</Heading>
      <ReportsList items={reports} onClose={close} />
      <Heading>{ro.app.admin.waterSubmissions}</Heading>
      <WaterSubmissionsList items={waterSubmissions} onResolve={resolveWater} />
    </>
  );
}
export default function AdminPage() {
  return (
    <Screen title={ro.app.admin.title} back>
      <AdminGate>
        <Dashboard />
      </AdminGate>
    </Screen>
  );
}
