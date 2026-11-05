import jpeg from 'npm:jpeg-js@0.4.4';
import { HttpError } from './http.ts';

// Re-encoding decoded pixels strips EXIF/GPS and all other source metadata.
export function cleanJpeg(base64: string): Uint8Array {
  try {
    if (
      !base64 || base64.length > 2_000_000 || base64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
    ) throw new Error();
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (
      bytes.length > 1_500_000 || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes.at(-2) !== 255 || bytes.at(-1) !== 217
    ) throw new Error();
    const image = jpeg.decode(bytes, {
      useTArray: true,
      tolerantDecoding: false,
      maxResolutionInMP: 16,
      maxMemoryUsageInMB: 128,
    });
    const encoded =
      jpeg.encode({ width: image.width, height: image.height, data: image.data }, 90).data;
    if (encoded.length > 1_500_000) throw new Error();
    return new Uint8Array(encoded);
  } catch {
    throw new HttpError(400, 'Imagine JPEG invalidă.');
  }
}
