import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_BYTES = 1_500_000;
const PASSES = [{ side: 1600, compress: 0.8 }, { side: 1600, compress: 0.6 }, { side: 1200, compress: 0.4 }] as const;

function base64Bytes(b64: string): number {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

export async function compressPhoto(uri: string): Promise<{ uri: string; base64: string; bytes: number }> {
  let portrait = false;
  for (const { side, compress } of PASSES) {
    const opts = { compress, format: SaveFormat.JPEG, base64: true };
    let res = await manipulateAsync(uri, [{ resize: portrait ? { height: side } : { width: side } }], opts);
    if (!portrait && res.height > side) {
      portrait = true;
      res = await manipulateAsync(uri, [{ resize: { height: side } }], opts);
    }
    const base64 = res.base64 ?? '';
    const bytes = base64Bytes(base64);
    if (base64 && bytes <= MAX_BYTES) return { uri: res.uri, base64, bytes };
  }
  throw new Error('Photo exceeds 1.5 MB limit after compression');
}
