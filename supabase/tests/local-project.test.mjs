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

test('maintenance permits only the exact current CI project and preserves other guards', () => {
  const names = ['GITHUB_ACTIONS', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'];
  const before = names.map(name => process.env[name]);
  try {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_RUN_ID = '123456';
    process.env.GITHUB_RUN_ATTEMPT = '2';
    assert.equal(localProject('project_id = "okbite-c3-ci-123456-2"\n'), 'okbite-c3-ci-123456-2');
    for (const id of ['okbite-c3-ci-123456-1', 'okbite-c3-ci-999999-2', 'okbite-production']) {
      assert.throws(() => localProject(`project_id = "${id}"\n`), /Refusing/);
    }
    process.env.GITHUB_ACTIONS = 'false';
    assert.throws(() => localProject('project_id = "okbite-c3-ci-123456-2"\n'), /Refusing/);
  } finally {
    names.forEach((name, index) => {
      if (before[index] === undefined) delete process.env[name];
      else process.env[name] = before[index];
    });
  }
});

test('photo recovery is bound to the selected local project API', async () => {
  const { localApiUrl } = await import('../local-project.mjs');
  const config = 'project_id = "okbite-r2-review"\n[api]\nport = 59431\n[db]\nport = 59432\n';
  for (const newline of ['\n', '\r\n']) {
    for (const host of ['127.0.0.1', 'localhost']) {
      assert.equal(localApiUrl(config.replaceAll('\n', newline), `http://${host}:59431`).port, '59431');
    }
  }
  for (const url of [
    'http://127.0.0.1:58431', 'http://localhost:54321',
    'https://127.0.0.1:59431', 'https://hosted.supabase.co',
    'http://user:password@127.0.0.1:59431',
    'http://127.0.0.1:59431/storage', 'http://127.0.0.1:59431?project=other',
    'http://127.0.0.1:59431#other',
  ]) assert.throws(() => localApiUrl(config, url), /local project API/);
  assert.throws(() => localApiUrl(config.replace('okbite-r2-review', 'unrelated'), 'http://127.0.0.1:59431'), /Refusing/);
  assert.throws(() => localApiUrl('project_id = "okbite"', 'http://127.0.0.1:59431'), /local project API/);
});
