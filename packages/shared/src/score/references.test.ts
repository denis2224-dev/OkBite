import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { ScoreFixture } from '../contract';

const fixtures = ScoreFixture.array().min(30).parse(JSON.parse(readFileSync(
  new URL('../../../../data/score-fixtures.json', import.meta.url), 'utf8',
)));

it('requires independent calculator evidence for every current fixture, bound to its content', () => {
  const evidence = z.object({ fixtures: z.array(z.object({
    name: z.string(), fixtureSha256: z.string(), sourceUrl: z.string().url(),
    reference: z.object({ calculatorId: z.literal('SpF-20240404'), sheet: z.string(),
      row: z.number().int().min(3), points: z.number().int().nullable(), letter: z.enum(['A','B','C','D','E']),
      fpsAgreement: z.literal(true) }),
  })).min(30) }).parse(JSON.parse(readFileSync(
    new URL('../../../../data/score-fixtures.validation.json', import.meta.url), 'utf8',
  )));
  expect(evidence.fixtures.map((f) => f.name).sort()).toEqual(fixtures.map((f) => f.name).sort());
  for (const f of fixtures) {
    const row = evidence.fixtures.find((r) => r.name === f.name)!;
    expect(row.fixtureSha256).toBe(createHash('sha256').update(JSON.stringify(f)).digest('hex'));
    expect(row.reference.points).toBe(f.scoreKind === 'water' ? null : f.expectedPoints);
    expect(row.reference.letter).toBe(f.expectedLetter);
  }
});

// SpF FAQ V11 pp.16–20: water, milk, seeds, and plant cheese substitutes have distinct rules.
it.each([
  ['4841257001275', 'water', 0, 'A'],
  ['4840362001095', 'beverage', 2, 'B'],
  ['4840811002024', 'fat', -10, 'A'],
  ['5000295157569', 'general', 20, 'E'],
])('uses the official category for %s', (code, scoreKind, expectedPoints, expectedLetter) => {
  expect(fixtures.find((f) => f.name.includes(String(code))))
    .toMatchObject({ scoreKind, expectedPoints, expectedLetter });
});
