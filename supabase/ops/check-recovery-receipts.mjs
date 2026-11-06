import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Run after the guarded local drill with a known, disposable receipt fixture.
// A schema-only/grant check cannot establish that receipt data was recovered.
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const expected = Number(process.argv[3]);
assert.ok(Number.isSafeInteger(expected) && expected > 0, 'Supply the known receipt count');
assert.equal(report.counts.receipts, expected, 'Recovery must compare receipt rows too');
assert.equal(report.pgTap, 'passed');
console.log('Recovery receipt count verified.');
