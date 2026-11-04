import { scanFromURLAsync } from 'expo-camera';
import { normalizeCode } from '@okbite/shared';

export async function findBarcode(uri: string): Promise<string | null> {
  try {
    for (const hit of (await scanFromURLAsync(uri, ['ean13', 'ean8', 'upc_a'])) ?? []) {
      const code = normalizeCode(hit.data ?? '');
      if (code) return code;
    }
    return null;
  } catch {
    return null;
  }
}
