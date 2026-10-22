import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {aiGuide} from '../ai-data.js';
import {course} from '../course-data.js';
import {capstone} from '../capstone-data.js';

const g = aiGuide, pl = g.pipeline;
const links = [...g.services.rows.map(r => r[1]), ...[g.services.sources, g.data.sources, ...g.rules.map(r => r.sources)].flat().map(s => s[1])];

test('Факультатив вне бюджета часов: 118 ч и 100 ч проекта не меняются', () => {
  assert.equal(capstone.hoursTotal, 118);
  assert.equal(capstone.checkpoints.reduce((a, k) => a + k.hours, 0), 100);
  assert.match(g.status, /Не входит в 118 часов/);
});

test('Каждое правило объяснено и опирается на источник или на устройство курса', () => {
  assert.ok(g.rules.length >= 6 && g.rules.length <= 10);
  for (const r of g.rules) {
    assert.ok(r.title && r.text.length > 60 && r.why.length > 60, r.title);
    for (const [t, u, pub] of r.sources) assert.ok(t && /^https:\/\//.test(u) && pub, r.title);
  }
  assert.ok(g.rules.filter(r => r.sources.length).length >= g.rules.length - 1, 'без источника — не больше одного правила (о расчётах в рабочей тетради)');
});

test('Раздел о данных организации называет запреты, обезличивание и нормы закона', () => {
  assert.ok(g.data.never.length >= 3 && g.data.how.length >= 4);
  const law = g.data.law.map(r => r.join(' ')).join(' ');
  for (const k of ['152-ФЗ', 'ст. 3', 'ч. 5 ст. 18', 'ст. 12', '98-ФЗ', 'ст. 10']) assert.ok(law.includes(k), k);
});

test('Промпты для уроков запрещают поиск, требуют дословных цитат и вопросов по одному', () => {
  const lessonPrompts = g.prompts.filter(p => p.lesson);
  assert.equal(lessonPrompts.length, 4);
  for (const p of [...lessonPrompts, ...pl.prompts]) assert.match(p.text, /^Не используй поиск в интернете/, p.id);
  for (const p of lessonPrompts) assert.ok(p.text.includes('[ТЕКСТ УРОКА]') || p.id === 'p4', p.id);
  for (const id of ['p1', 'p3']) assert.match(g.prompts.find(p => p.id === id).text, /строго по одному/);
  for (const id of ['p1', 'p2', 'p4']) assert.match(g.prompts.find(p => p.id === id).text, /дословн/);
  const p5 = g.prompts.find(p => p.id === 'p5');
  assert.match(p5.text, /URL дать не могу/); assert.match(p5.text, /Не вычисляй/); assert.match(p5.text, /Вторичные источники/);
  assert.equal(new Set([...g.prompts, ...pl.prompts].map(p => p.id)).size, g.prompts.length + pl.prompts.length);
});

test('Пайплайн: восемь шагов, допуск, приложения и вопросы по всем критериям рубрики', () => {
  assert.equal(pl.steps.length, 8);
  assert.match(pl.steps[0].ai, /Не используется/);
  assert.match(pl.admission, /допуска к защите/);
  assert.equal(pl.slop.items.length, 8);
  assert.equal(pl.log.header.length, pl.log.example[0].length);
  assert.equal(pl.claims.header.length, pl.claims.example[0].length);
  assert.ok(pl.teacher.steps.length <= 6);
  const groups = pl.defense.groups.map(([c]) => c);
  for (const r of course.rubric) assert.ok(groups.includes(r.criterion), r.criterion);
  for (const [, qs] of pl.defense.groups) for (const q of qs) assert.match(q, /\?$/);
  const kt6 = capstone.checkpoints.find(k => k.id === 'kt6');
  assert.ok(kt6.steps.some(s => s.includes('журнал использования ИИ')) && kt6.check.some(c => c.includes('журнал ИИ')));
  assert.match(capstone.grading, /приложениями А и Б/);
});

test('Ссылки факультатива проверены из России', () => {
  const check = JSON.parse(fs.readFileSync(new URL('../data/cases-linkcheck.json', import.meta.url), 'utf8'));
  for (const u of links) {
    const r = check.urls[u];
    assert.ok(r, 'не проверялась ' + u);
    assert.ok(r.ru.ok || r.archive?.ruOk, 'не открывается из России ни сама, ни архивная копия: ' + u);
  }
});

test('Тексты факультатива без запрещённых формулировок', () => {
  const src = fs.readFileSync(new URL('../ai-data.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /синтетич|вымышл|только для преподавателя|TODO/i);
});
