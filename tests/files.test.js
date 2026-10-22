import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mediaMap} from '../media-map.js';
import {capstone} from '../capstone-data.js';
const root = new URL('../', import.meta.url);
const exists = p => fs.existsSync(new URL(p, root));
const srcs = ['app.js', 'capstone-data.js', 'course-data.js', 'cases-data.js', 'index.html'].map(f => fs.readFileSync(new URL(f, root), 'utf8')).join('\n');
test('Every linked file in the site exists', () => {
  const refs = [...new Set([...srcs.matchAll(/(?:templates|data|vendor)\/[\w.\-]+\.(?:docx|pptx|xlsx|pdf|csv|js)/g)].map(m => m[0]))];
  assert.ok(refs.length >= 10);
  for (const r of refs) assert.ok(exists(r), 'missing ' + r);
  for (const k of capstone.checkpoints) for (const [f] of k.templates || []) assert.ok(exists(f), k.id + ' ' + f);
});
test('Every media slot has its files', () => {
  for (const [where, list] of Object.entries(mediaMap)) for (const m of list) {
    if (m.type === 'svg') { assert.ok(exists(`figures/${m.id}.svg`), m.id); const meta = JSON.parse(fs.readFileSync(new URL(`figures/${m.id}.json`, root), 'utf8')); assert.ok(meta.caption && meta.alt, m.id); }
    if (m.type === 'widget') assert.ok(exists(`widgets/${m.id}.js`), m.id);
    if (m.type === 'video') for (const ext of ['mp4', 'vtt', 'txt', 'jpg']) assert.ok(exists(`media/${m.id}.${ext}`), m.id + '.' + ext);
  }
});
test('Markdown and JSON are not offered as submission formats', () => {
  assert.doesNotMatch(srcs, /\.md\b|Markdown|text\/markdown/);
  for (const row of capstone.submission) assert.doesNotMatch(row.join(' '), /\.md|json|Markdown/i);
});
test('No internal leftovers on student pages', () => {
  assert.doesNotMatch(srcs, /mayak-(?!course-v1)|Лаборатория туристического маркетинга|· Маяк'|РПД, раздел|Связь с курсом и РПД/);
});
