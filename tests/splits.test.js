import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {course} from '../course-data.js';
import {capstone} from '../capstone-data.js';
import {splits} from '../splits-data.js';
import {caseStudies} from '../cases-data.js';
import {validProgress} from '../engine.js';

const lessons = course.modules.flatMap(m => m.lessons);
const ids = lessons.map(l => l.id);
const words = s => s.trim().split(/\s+/).length;
const check = JSON.parse(fs.readFileSync(new URL('../data/cases-linkcheck.json', import.meta.url), 'utf8'));
const PRESSURE = /необходимо|вы должны|должны|обязательно|нужно/i;

test('У каждого урока есть правило-образец от первого лица, без давления', () => {
  for (const l of lessons) {
    assert.ok(typeof l.rule === 'string', `${l.id}: нет правила`);
    assert.ok(l.rule.length >= 60 && l.rule.length <= 220, `${l.id}: длина правила ${l.rule.length}`);
    assert.match(l.rule, /^(Я|Прежде|Сначала|Каждый|Каждое|Канал|Пакеты|Свободную|Скидку|Неизвестное|Сегмент|Конкурентов|Эффект|В анализ|Экологическое|Рекомендацию)\s/, `${l.id}: правило начинается необычно`);
    assert.match(l.rule, /(^|[\s,«])(я|мне|меня|мой|моя)([\s,.»]|$)/i, `${l.id}: правило не от первого лица`);
    assert.doesNotMatch(l.rule, PRESSURE, `${l.id}: правило звучит как предписание`);
    assert.match(l.rule, /\.$/, `${l.id}: правило — законченная фраза`);
  }
  assert.equal(new Set(lessons.map(l => l.rule)).size, lessons.length, 'правила не повторяются');
});

test('Правила и выбор по спорным вопросам сохраняются и проходят импорт', () => {
  const p = validProgress({rules: {m1l1: 'Я записываю решение.', bad: 'x'}, splits: {m1: 'Сторона А', x9: 'y'}}, ids);
  assert.deepEqual(p.rules, {m1l1: 'Я записываю решение.'});
  assert.deepEqual(p.splits, {m1: 'Сторона А'});
  assert.equal(validProgress({rules: {m1l1: 'я'.repeat(1000)}}, ids).rules.m1l1.length, 400);
});

test('По одному спорному вопросу на модуль, со сторонами и выбором', () => {
  assert.deepEqual(splits.map(s => s.id), course.modules.map(m => m.id));
  for (const s of splits) {
    for (const f of ['question', 'why', 'crux', 'course_position', 'decide', 'kt_question']) assert.ok(typeof s[f] === 'string' && s[f].trim().length > 20, `${s.id}: ${f}`);
    assert.match(s.question.trim(), /\?$/, `${s.id}: вопрос`);
    assert.match(s.kt_question.trim(), /\?$/, `${s.id}: вопрос к КТ`);
    assert.ok(capstone.checkpoints.some(k => k.id === s.kt), `${s.id}: kt`);
    const mod = course.modules.find(m => m.id === s.id);
    assert.ok(s.lessons.length >= 1 && s.lessons.every(id => mod.lessons.some(l => l.id === id)), `${s.id}: уроки из своего модуля`);
    for (const c of s.cases || []) assert.ok(Object.values(caseStudies).flat().some(x => x.id === c), `${s.id}: кейс ${c}`);
    assert.ok(s.sides.length >= 2 && s.sides.length <= 3, `${s.id}: стороны`);
    for (const d of s.sides) for (const f of ['label', 'claim', 'who', 'evidence', 'strong_when']) assert.ok(typeof d[f] === 'string' && d[f].trim().length >= 3, `${s.id}: ${f}`);
    const n = ['why', 'crux', 'course_position', 'decide'].reduce((a, f) => a + words(s[f]), 0) + s.sides.reduce((a, d) => a + words(d.claim) + words(d.evidence) + words(d.strong_when), 0);
    assert.ok(n >= 250 && n <= 520, `${s.id}: ${n} слов`);
  }
});

test('Источники спорных вопросов: уровень A/B, у каждой стороны есть опора, ссылки открываются из России и имеют архив', () => {
  for (const s of splits) {
    assert.ok(s.sources.length >= 5, `${s.id}: источников ${s.sources.length}`);
    const hosts = s.sources.map(x => new URL(x.url).host.replace(/^www\./, ''));
    for (const h of new Set(hosts)) assert.ok(hosts.filter(x => x === h).length <= 2, `${s.id}: больше двух источников с ${h}`);
    for (const x of s.sources) {
      assert.ok(['A', 'B'].includes(x.tier), `${s.id}: уровень ${x.url}`);
      assert.match(x.url, /^https:\/\//);
      for (const f of ['title', 'publisher', 'lang']) assert.ok(x[f], `${s.id}: ${f}`);
      const r = check.urls[x.url];
      assert.ok(r, `${s.id}: ссылка не проверялась — node tools/check-case-links.mjs ${x.url}`);
      assert.ok(r.archive?.url, `${s.id}: нет архивной копии ${x.url}`);
      assert.equal(x.archive, r.archive.url, `${s.id}: архивная ссылка совпадает с проверенной`);
      if (!r.ru.ok) {
        const answered = Object.values(r.ru.nodes || {}).length === 3 && Object.values(r.ru.nodes).every(n => n.code && /^[1-5]\d\d$/.test(String(n.code)));
        assert.ok(answered, `${s.id}: не открывается из России ${x.url}`);
        assert.equal(r.archive.ruOk, true, `${s.id}: архив не открывается из России ${x.url}`);
        assert.equal(x.viaArchive, true, `${s.id}: должна вести на архив ${x.url}`);
      }
    }
  }
});

test('Тексты спорных вопросов и правил без запрещённых формулировок', () => {
  const src = fs.readFileSync(new URL('../splits-data.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /синтетич|вымышл|придуман|для преподавателя|TODO|TBD|\?\?|необходимо|вы должны/i);
});
