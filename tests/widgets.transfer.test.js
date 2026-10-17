import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../widgets/transfer.js';

const near = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('x = 140, d = 0: 959 400, ориентир прямого 705 640, преимущество 253 760', () => {
  const r = compute({x: 140, d: 0});
  assert.equal(r.corporate, 959400); assert.equal(r.direct, 705640); assert.equal(r.advantage, 253760); assert.equal(r.ahead, true);
});
test('значения по умолчанию: x = 140, d = 0', () => {
  const r = compute(); assert.equal(r.x, 140); assert.equal(r.d, 0); assert.equal(r.corporate, 959400);
});
test('предел скидки при x = 140: 253 760 / 300 = 845,87 ₽', () => {
  const r = compute({x: 140});
  near(r.limit, 845.87, 0.005); near(r.limit, 253760 / 300, 1e-9);
  // при скидке ровно на пределе преимущество исчезает
  near(compute({x: 140, d: 253760 / 300}).advantage, 0, 1e-6);
  assert.ok(compute({x: 140, d: 846}).advantage < 0);
  assert.ok(compute({x: 140, d: 845}).advantage > 0);
});
test('скидка уменьшает результат на 300 · d', () => {
  assert.equal(compute({x: 140, d: 100}).corporate, 959400 - 30000);
  assert.equal(compute({x: 140, d: 1000}).corporate, 959400 - 300000);
});
test('крайние значения: x = 0 даёт 251 000, x = 150 даёт 1 010 000', () => {
  assert.equal(compute({x: 0, d: 0}).corporate, 251000);
  assert.equal(compute({x: 150, d: 0}).corporate, 1010000);
  assert.equal(compute({x: 150, d: 0}).remaining, 0);
  near(compute({x: 150}).limit, 304360 / 300, 1e-9);
  assert.ok(compute({x: 0}).limit < 0); assert.equal(compute({x: 0}).ahead, false);
});
test('перенос сверх 150 ночей бесполезен: вытесняются только 150', () => {
  const a = compute({x: 150, d: 0}), b = compute({x: 200, d: 0});
  assert.equal(b.corporate, a.corporate); assert.equal(b.xe, 150); assert.equal(b.wasted, 50);
});
test('без скидки корпоративный не хуже прямого начиная с 90 перенесённых ночей', () => {
  assert.equal(compute({x: 140}).minX, 90);
  assert.ok(compute({x: 89}).advantage < 0); assert.ok(compute({x: 90}).advantage > 0);
});
