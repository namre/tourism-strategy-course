import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../widgets/barrier.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('20 / 5 / 10: гибкий 387 200, невозвратный 387 000, разница −200', () => {
  const r = compute({flexCancel: 20, nrCancel: 5, discount: 10});
  assert.equal(r.flexCompleted, 88); assert.equal(r.flexMargin, 387200);
  assert.equal(r.nrPrice, 5580); assert.equal(r.nrRevenue, 558000); assert.equal(r.nrCompleted, 95);
  assert.equal(r.nrMargin, 387000); assert.equal(r.diff, -200);
});
test('значения по умолчанию: 20 / 5 / 10', () => {
  const r = compute(); assert.deepEqual([r.flexCancel, r.nrCancel, r.discount], [20, 5, 10]); assert.equal(r.diff, -200);
});
test('10 / 3 / 10: разница −30 200 в пользу гибкого', () => {
  const r = compute({flexCancel: 10, nrCancel: 3, discount: 10});
  assert.equal(r.flexMargin, 413600); assert.equal(r.nrMargin, 383400); assert.equal(r.diff, -30200); assert.equal(r.verdict, 'flex');
});
test('безубыточность при 20 / 5 / 10 около 20 % (≈ 20,08)', () => {
  const r = compute({flexCancel: 20, nrCancel: 5, discount: 10});
  near(r.breakeven, 20.08, 0.005); assert.equal(r.status, 'inside');
  // при отменах гибкого на уровне безубыточности маржи равны
  near(compute({flexCancel: r.breakeven, nrCancel: 5, discount: 10}).diff, 0, 1e-6);
});
test('при отменах гибкого выше безубыточности барьер окупается', () => {
  const r = compute({flexCancel: 30, nrCancel: 5, discount: 10});
  assert.ok(r.diff > 0); assert.equal(r.verdict, 'barrier');
  assert.equal(r.flexMargin, (100 - 0.6 * 30) * 4400);
});
test('крайние значения: без отмен и скидки тарифы равны 440 000', () => {
  const r = compute({flexCancel: 0, nrCancel: 0, discount: 0});
  assert.equal(r.flexMargin, 440000); assert.equal(r.nrMargin, 440000); assert.equal(r.diff, 0); assert.equal(r.verdict, 'tie');
});
test('худший для барьера случай (скидка 20 %, отмены 15 %, гибкий без отмен): проигрыш 97 000', () => {
  const r = compute({flexCancel: 0, nrCancel: 15, discount: 20});
  assert.equal(r.nrMargin, 4960 * 100 - 85 * 1800); assert.equal(r.flexMargin, 440000);
  assert.equal(r.diff, -97000); assert.equal(r.verdict, 'flex'); assert.equal(r.status, 'inside');
  near(r.breakeven, 36.74, 0.01);
});
test('без скидки невозвратный окупается при любых отменах гибкого', () => {
  const r = compute({flexCancel: 40, nrCancel: 15, discount: 0});
  assert.equal(r.status, 'always'); assert.ok(r.diff > 0);
});
