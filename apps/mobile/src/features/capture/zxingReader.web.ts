import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { normalizeCode } from '@okbite/shared';
import { expandUpce } from './expandUpce.web';

export function createZxingReader() {
  // The browser layer exposes no reset; release its underlying decoder state explicitly.
  class Reader extends BrowserMultiFormatReader {
    reset() { this.reader.reset(); }
    decodeFromCanvas(canvas: HTMLCanvasElement) {
      if (!this.hints.get(DecodeHintType.TRY_HARDER) || canvas.width === canvas.height) return super.decodeFromCanvas(canvas);
      // This browser layer rotates pixels without swapping luminance dimensions.
      // Square photo input keeps its 90-degree rotation valid; live frames stay untouched.
      const square = document.createElement('canvas');
      square.width = square.height = Math.max(canvas.width, canvas.height);
      const context = square.getContext('2d');
      if (!context) return super.decodeFromCanvas(canvas);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, square.width, square.height);
      context.drawImage(canvas, (square.width - canvas.width) / 2, (square.height - canvas.height) / 2);
      return super.decodeFromCanvas(square);
    }
    async readCode(source: string | HTMLVideoElement) {
      const photo = typeof source === 'string';
      const previousHints = this.hints;
      if (photo) this.setHints(new Map(previousHints).set(DecodeHintType.TRY_HARDER, true));
      try {
        const result = typeof source === 'string' ? await this.decodeFromImageUrl(source) : this.decode(source);
        const raw = result.getText();
        // UPC-E's eight digits are compressed UPC-A, not an EAN-8 barcode.
        return normalizeCode(result.getBarcodeFormat() === BarcodeFormat.UPC_E ? expandUpce(raw) : raw);
      } finally {
        if (photo) this.setHints(previousHints);
      }
    }
  }
  const reader = new Reader();
  reader.possibleFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
  return reader;
}
