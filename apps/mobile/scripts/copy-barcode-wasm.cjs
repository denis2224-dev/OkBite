const { copyFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

// Resolve the reader through the same pinned dependency the browser uses.
const decoderRequire = createRequire(require.resolve('barcode-detector/ponyfill'));
const reader = decoderRequire.resolve('zxing-wasm/reader/zxing_reader.wasm');
const output = process.argv[2] ?? 'dist';
copyFileSync(reader, resolve(output, 'zxing_reader.wasm'));
