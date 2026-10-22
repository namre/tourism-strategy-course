import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {course} from '../course-data.js';
import {capstone} from '../capstone-data.js';
import {caseStudies} from '../cases-data.js';

const lessons = course.modules.flatMap(m => m.lessons.map(l => ({...l, module: m.id})));
const all = Object.entries(caseStudies).flatMap(([lesson, list]) => list.map(c => ({lesson, ...c})));
const words = s => s.trim().split(/\s+/).length;
const check = JSON.parse(fs.readFileSync(new URL('../data/cases-linkcheck.json', import.meta.url), 'utf8'));

test('Каждый урок получил 1–2 кейса, привязанных к существующей секции и контрольной точке', () => {
  for (const l of lessons) {
    const list = caseStudies[l.id] || [];
    assert.ok(list.length >= 1 && list.length <= 2, `${l.id}: ${list.length} кейсов`);
    for (const c of list) {
      assert.ok(Number.isInteger(c.after) && c.after >= 0 && c.after < l.sections.length, `${l.id}/${c.id}: after`);
      assert.ok(capstone.checkpoints.some(k => k.id === c.kt), `${l.id}/${c.id}: kt ${c.kt}`);
    }
  }
  assert.deepEqual(Object.keys(caseStudies).filter(id => !lessons.some(l => l.id === id)), []);
  assert.equal(new Set(all.map(c => c.id)).size, all.length, 'id кейсов уникальны');
});

test('Поля карточки заполнены и укладываются в объём', () => {
  for (const c of all) {
    for (const f of ['id', 'title', 'org', 'place', 'decision', 'result', 'mechanism', 'limits', 'question']) assert.ok(typeof c[f] === 'string' && c[f].trim().length > 3, `${c.id}: ${f}`);
    assert.ok(['success', 'failure', 'contested'].includes(c.outcome), `${c.id}: outcome`);
    assert.ok(Number.isInteger(c.year) && c.year >= 1990 && c.year <= 2026, `${c.id}: year`);
    assert.ok(Number.isInteger(c.dataYear) && c.dataYear >= c.year - 1 && c.dataYear <= 2026, `${c.id}: dataYear`);
    const n = ['decision', 'result', 'mechanism', 'limits', 'question'].reduce((a, f) => a + words(c[f]), 0);
    assert.ok(n >= 70 && n <= 190, `${c.id}: ${n} слов`);
    assert.ok(/\?$/.test(c.question.trim()), `${c.id}: вопрос к КТ заканчивается вопросительным знаком`);
    assert.ok(c.sources.length >= 1, `${c.id}: источники`);
    for (const s of c.sources) {
      assert.match(s.url, /^https:\/\//, `${c.id}: https`);
      for (const f of ['title', 'publisher', 'lang']) assert.ok(s[f], `${c.id}: source ${f}`);
      assert.ok(Number.isInteger(s.year), `${c.id}: source year`);
      assert.ok(['A', 'B'].includes(s.tier), `${c.id}: уровень источника A или B`);
    }
  }
});

test('В каждом модуле есть успех, провал и спорный случай', () => {
  for (const m of course.modules) {
    const kinds = new Set(all.filter(c => m.lessons.some(l => l.id === c.lesson)).map(c => c.outcome));
    assert.ok(kinds.has('failure') || kinds.has('contested'), `${m.id}: нет провалов или спорных случаев`);
  }
  const kinds = new Set(all.map(c => c.outcome));
  for (const k of ['success', 'failure', 'contested']) assert.ok(kinds.has(k), k);
});

test('Каждая ссылка открывается со всех российских узлов и имеет архивную копию', () => {
  assert.equal(check.controls.open.ok, true, 'контроль: открытый сайт должен открываться');
  assert.equal(check.controls.blocked.ok, false, 'контроль: заблокированный сайт не должен открываться хотя бы на одном узле');
  for (const c of all) for (const s of c.sources) {
    const r = check.urls[s.url];
    assert.ok(r, `${c.id}: ссылка не проверялась — node tools/check-case-links.mjs`);
    assert.equal(r.ru.ok, true, `${c.id}: не открывается из России ${s.url}`);
    assert.ok(r.archive?.url, `${c.id}: нет копии в Wayback ${s.url}`);
    assert.equal(s.archive, r.archive.url, `${c.id}: архивная ссылка в карточке совпадает с проверенной`);
  }
});

test('Тексты кейсов без запрещённых формулировок и служебных пометок', () => {
  const src = fs.readFileSync(new URL('../cases-data.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /синтетич|вымышл|придуман|выдуман|для преподавателя|TODO|TBD|\?\?/i);
});
