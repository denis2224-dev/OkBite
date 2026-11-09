import { useEffect, useState } from 'react';
import { Image, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ProductInput } from '@okbite/shared';
import { Screen, Body, Button } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useTheme } from '../../../src/theme/useTheme';
import { AdminGate } from '../../../src/features/admin/AdminGate';
import { ProductEditor } from '../../../src/features/admin/ProductEditor';
import { readAdminProduct, sendModeration } from '../../../src/features/admin/client';
function Editor({ id }: { id: string }) {
  const { colors } = useTheme();
  const [product, setProduct] = useState<ProductInput | null>(null);
  const [photos, setPhotos] = useState<{ label: string; url: string }[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void readAdminProduct(id)
      .then((result) => {
        if (alive) {
          setProduct(result.input);
          setPhotos(result.photos);
        }
      })
      .catch(() => {
        if (alive) setError(ro.app.admin.failed);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  const hide = async () => {
    setBusy(true);
    setError('');
    try {
      await sendModeration({ action: 'hide', productId: id, reason: reason.trim() });
      router.replace('/admin');
    } catch {
      setError(ro.app.admin.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!!error && <Body accessibilityRole="alert">{error}</Body>}
      {photos.map((photo) => (
        <Image
          key={photo.label}
          source={{ uri: photo.url }}
          accessibilityLabel={photo.label}
          style={{ width: '100%', height: 240 }}
          resizeMode="contain"
        />
      ))}
      {product ? (
        <ProductEditor
          initial={product}
          onSave={async (value) => {
            await sendModeration({ action: 'verify', productId: id, product: value });
            router.replace('/admin');
          }}
        />
      ) : (
        <Body>{ro.app.loading}</Body>
      )}
      <TextInput
        accessibilityLabel={ro.app.admin.reason}
        value={reason}
        onChangeText={setReason}
        style={{
          color: colors.ink,
          borderColor: colors.border,
          minHeight: 48,
          borderWidth: 1,
          padding: 12,
        }}
      />
      <Button disabled={busy || reason.trim().length < 3 || !product} onPress={() => void hide()}>
        {ro.app.admin.hide}
      </Button>
    </>
  );
}
export default function AdminProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen title={ro.app.admin.title} back>
      <AdminGate>
        <Editor key={id} id={id} />
      </AdminGate>
    </Screen>
  );
}
