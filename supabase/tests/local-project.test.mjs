import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localProject } from '../local-project.mjs';

test('local maintenance accepts only explicit team and isolated fixture projects', () => {
  for (const id of ['okbite', 'okbite-c2', 'okbite-c3-cd37', 'okbite-c6', 'okbite-r2-review']) {
    assert.equal(localProject(`project_id = "${id}"\n`), id);
  }
  for (const id of ['hosted-project', 'unrelated', 'okbite-production', 'okbite-arbitrary', 'okbite-c3-other']) {
    assert.throws(() => localProject(`project_id = "${id}"\n`), /Refusing unrecognized local project/);
  }
  assert.throws(() => localProject('# project_id = "okbite"'), /Refusing/);
});
