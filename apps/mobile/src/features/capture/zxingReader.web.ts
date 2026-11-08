import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { normalizeCode } from '@okbite/shared';

export function createZxingReader() {
  // The browser layer exposes no reset; release its underlying decoder state explicitly.
  class Reader extends BrowserMultiFormatReader {
    reset() { this.reader.reset(); }
    async readCode(source: string | HTMLVideoElement) {
      const result = typeof source === 'string' ? await this.decodeFromImageUrl(source) : this.decode(source);
      const raw = result.getText();
      // UPC-E's eight digits are compressed UPC-A, not an EAN-8 barcode.
      return normalizeCode(result.getBarcodeFormat() === BarcodeFormat.UPC_E ? expandUpce(raw) : raw);
    }
  }
  const reader = new Reader();
  reader.possibleFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
  return reader;
}

function expandUpce(raw: string): string {
  if (!/^[01]\d{7}$/.test(raw)) return '';
  const system = raw.slice(0, 1), data = raw.slice(1, 7), last = data.slice(-1), check = raw.slice(-1);
  if ('012'.includes(last)) return system + data.slice(0, 2) + last + '0000' + data.slice(2, 5) + check;
  if (last === '3') return system + data.slice(0, 3) + '00000' + data.slice(3, 5) + check;
  if (last === '4') return system + data.slice(0, 4) + '00000' + data.slice(4, 5) + check;
  return system + data.slice(0, 5) + '0000' + last + check;
}
