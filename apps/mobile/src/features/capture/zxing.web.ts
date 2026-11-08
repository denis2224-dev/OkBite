/** Keep ZXing out of the browser's native-detector path. */
export async function createZxingReader() {
  const zxing = await import('./zxingReader.web');
  return zxing.createZxingReader();
}
