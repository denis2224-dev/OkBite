// U4: runs read-label on real package photos and compares the answer with ground truth a person typed.
// Usage: pnpm label:accuracy [folder]; the folder layout is in docs/ops/label-accuracy-how-to.md.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { NUTRIENT_KEYS, type NutrientKey, Nutrients, NutritionMode, ReadLabelResponse, Unit } from '../packages/shared/src/index';

/** truth.json, typed by a person from the package. null = the package does not print it. */
export const Truth = z.object({
  nutrition: NutritionMode,
  ingredientsText: z.string().min(3),
  unit: Unit.nullable(),
  nutrients: Nutrients,
}).strict();
export type Truth = z.infer<typeof Truth>;
type Read = Pick<ReadLabelResponse, 'ingredientsText' | 'unit' | 'nutrients'>;
type Field = NutrientKey | 'ingredientsText' | 'unit';
const FIELDS: Field[] = [...NUTRIENT_KEYS, 'unit', 'ingredientsText'];
export type Comparison = {
  fields: Record<Field, { exact: boolean; within?: boolean }>;
  invented: { key: NutrientKey; value: number }[];
  similarity: number;
};
export type Result = Comparison & { set: string; failed: boolean };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** 1 − edit distance / longer length, ignoring case and spacing. A missing text scores 0. */
export function similarity(a: string | null, b: string | null): number {
  if (a === null || b === null) return 0;
  const [x, y] = [norm(a), norm(b)];
  if (!x.length && !y.length) return 1;
  let row = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const next = [i];
    for (let j = 1; j <= y.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return 1 - row[y.length] / Math.max(x.length, y.length);
}

export function compare(truth: Truth, read: Read): Comparison {
  const fields = {} as Comparison['fields'];
  const invented: Comparison['invented'] = [];
  for (const key of NUTRIENT_KEYS) {
    const [t, r] = [truth.nutrients[key], read.nutrients[key]];
    // 1e-9: 2.5 + 0.1 is not exactly 2.6 in binary floating point.
    fields[key] = { exact: t === r, within: t === r || (t !== null && r !== null && Math.abs(t - r) <= 0.1 + 1e-9) };
    if (t === null && r !== null) invented.push({ key, value: r });
  }
  fields.unit = { exact: truth.unit === read.unit };
  fields.ingredientsText = { exact: truth.ingredientsText.trim() === read.ingredientsText?.trim() };
  return { fields, invented, similarity: similarity(truth.ingredientsText, read.ingredientsText) };
}

export function summarize(results: Result[]) {
  const answered = results.filter((r) => !r.failed);
  const fields = Object.fromEntries(FIELDS.map((f) => [f, {
    exact: answered.filter((r) => r.fields[f].exact).length,
    within: answered.filter((r) => r.fields[f].within ?? r.fields[f].exact).length,
    of: answered.length,
  }])) as Record<Field, { exact: number; within: number; of: number }>;
  const invented = results.flatMap((r) => r.invented);
  return {
    sets: results.length,
    failed: results.length - answered.length,
    fields,
    invented: invented.length,
    inventedZeros: invented.filter((i) => i.value === 0).length,
    meanSimilarity: answered.length ? answered.reduce((sum, r) => sum + r.similarity, 0) / answered.length : null,
  };
}

const comma = (n: number) => n.toFixed(3).replace('.', ',');

export function renderReport(
  s: ReturnType<typeof summarize>,
  results: Result[],
  meta: { model: string; date: string; sha: string; skipped: string[] },
): string {
  const head = [
    '# Label accuracy (U4), November 2026', '',
    `Date: ${meta.date} · Model (as stated by the person who ran it): ${meta.model} · Commit: ${meta.sha}`, '',
    'Written by `pnpm label:accuracy`. Ground truth was typed by a person from each package; the script never fills it.',
    'Photos stay in the git-ignored `label-photos/` folder.', '',
  ];
  if (!results.length) return [...head, 'No photo set has been run yet. There are no accuracy results.', ''].join('\n');
  const invented = results.flatMap((r) => r.invented.map((i) => `- ${r.set}: ${i.key} = ${String(i.value).replace('.', ',')}`));
  return [
    ...head,
    `Sets run: ${s.sets}. Sets where the AI gave no answer (reason \`failed\`): ${s.failed}. The table counts the other ${s.sets - s.failed}.`,
    '',
    '| Field | Exact match | Within 0,1 |', '| --- | --- | --- |',
    ...FIELDS.map((f) => {
      const c = s.fields[f];
      return `| ${f} | ${c.exact}/${c.of} | ${NUTRIENT_KEYS.includes(f as NutrientKey) ? `${c.within}/${c.of}` : '—'} |`;
    }),
    '',
    'A value the package does not print counts as exact only when the answer is also empty (null).', '',
    `Mean ingredients text similarity (1 − edit distance / length, case and spacing ignored): ${s.meanSimilarity === null ? 'not available' : comma(s.meanSimilarity)}`,
    '',
    `## Missing values returned as a number: ${s.invented} (of which zeros: ${s.inventedZeros})`, '',
    ...(invented.length ? invented : ['None.']), '',
    '## Per set', '',
    '| Set | AI answered | Fields exact | Text similarity |', '| --- | --- | --- | --- |',
    ...results.map((r) =>
      `| ${r.set} | ${r.failed ? 'no' : 'yes'} | ${FIELDS.filter((f) => r.fields[f].exact).length}/${FIELDS.length} | ${comma(r.similarity)} |`
    ),
    '',
    '## Sets not run', '',
    ...(meta.skipped.length ? meta.skipped.map((x) => `- ${x}`) : ['None.']), '',
  ].join('\n');
}

const MAX_JPEG_BYTES = 1_500_000; // read-label rejects larger photos; the app compresses before upload

async function main() {
  const dir = process.argv[2] ?? 'label-photos';
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const model = process.env.LABEL_MODEL;
  if (!url || !key || !model) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (staging) and LABEL_MODEL (the AI_MODEL in use).');
  }
  const results: Result[] = [];
  const skipped: string[] = [];
  const sets = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : [];
  for (const set of sets) {
    try {
      const file = (name: string) => join(dir, set, name);
      if (!existsSync(file('truth.json'))) throw new Error('no truth.json');
      const truth = Truth.parse(JSON.parse(readFileSync(file('truth.json'), 'utf8')));
      const photo = (name: string) => {
        const bytes = readFileSync(file(name));
        if (bytes.length > MAX_JPEG_BYTES) throw new Error(`${name} is over 1,5 MB`);
        return bytes.toString('base64');
      };
      const response = await fetch(`${url}/functions/v1/read-label`, {
        method: 'POST',
        // shortcut: a new device id per set, because the quota is 20 reads per device per day; staging only.
        headers: { 'content-type': 'application/json', 'x-device-id': randomUUID(), apikey: key, authorization: `Bearer ${key}` },
        body: JSON.stringify({
          ingredientsImage: photo('ingredients.jpg'),
          nutritionImage: truth.nutrition === 'separate' ? photo('nutrition.jpg') : null,
          nutrition: truth.nutrition,
        }),
      });
      if (!response.ok) throw new Error(`read-label answered HTTP ${response.status}`);
      const read = ReadLabelResponse.parse(await response.json());
      if (!read.reasons) throw new Error('the server does not return reasons (U3 is not deployed)');
      const failed = Object.values(read.reasons).includes('failed');
      results.push({ set, failed, ...compare(truth, read) });
      console.log(`${set}: ${failed ? 'AI failed' : 'read'}`);
    } catch (error) {
      skipped.push(`${set}: ${(error as Error).message.slice(0, 200)}`);
      console.warn(`${set}: skipped`);
    }
  }
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  const out = join(import.meta.dirname, '..', 'docs', 'ops', 'label-accuracy-2026-11.md');
  writeFileSync(out, renderReport(summarize(results), results, { model, date: new Date().toISOString().slice(0, 10), sha, skipped }));
  console.log(`Wrote ${out}: ${results.length} sets run, ${skipped.length} not run.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
}
