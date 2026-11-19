import { router } from 'expo-router';
import { ro } from '../../src/copy/ro';
import { AddWaterForm } from '../../src/features/admin/AddWaterForm';
import { AdminGate } from '../../src/features/admin/AdminGate';
import { createAdminWater } from '../../src/features/admin/client';
import { Screen } from '../../src/ui';

export default function AdminAddWaterPage() {
  return (
    <Screen title={ro.app.admin.addWaterTitle}>
      <AdminGate>
        <AddWaterForm
          onSave={async (value) => {
            const id = await createAdminWater(value);
            router.replace(id ? `/product/${id}` : '/admin');
          }}
        />
      </AdminGate>
    </Screen>
  );
}
