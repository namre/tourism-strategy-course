import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../widgets/thresholds.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const net = (r, id) => r.rows.find(x => x.id === id).net;

test('при m = 5 060 результаты совпадают с тренажёром: 450 600 / 705 640 / 251 000', () => {
  const r = compute({m: 5060});
  assert.deepEqual([net(r, 'ota'), net(r, 'direct'), net(r, 'corporate')], [450600, 705640, 251000]);
  assert.equal(r.best, 'direct');
});
test('прямые: А = 906 000 − 90m, П = 756 240 − 10m, К = 1 010 000 − 150m', () => {
  for (const m of [0, 1000, 1800, 3000, 7000]) {
    const r = compute({m});
    assert.equal(net(r, 'ota'), 906000 - 90 * m);
    assert.equal(net(r, 'direct'), 756240 - 10 * m);
    assert.equal(net(r, 'corporate'), 1010000 - 150 * m);
  }
});
test('пороги: К→А 1 733,33; А→П 1 872; попарное К–П 1 812,57', () => {
  const t = compute().thresholds;
  near(t.KA, 1733.33); near(t.AP, 1872, 1e-9); near(t.KP, 1812.57);
});
test('зоны лучшего пакета: К, затем А, затем П; пара К–П лежит внутри зоны А', () => {
  const r = compute();
  assert.deepEqual(r.zones.map(z => z.id), ['corporate', 'ota', 'direct']);
  near(r.zones[0].to, 1733.33); near(r.zones[1].to, 1872, 1e-9); assert.equal(r.zones[2].to, 7000);
  assert.ok(r.thresholds.KP > r.zones[1].from && r.thresholds.KP < r.zones[1].to);
});
test('лучший пакет при m = 1 000 / 1 800 / 3 000', () => {
  assert.equal(compute({m: 1000}).best, 'corporate');
  assert.equal(compute({m: 1800}).best, 'ota');
  assert.equal(compute({m: 3000}).best, 'direct');
  assert.equal(compute({m: 1800}).zone, 'ota');
  assert.deepEqual(['corporate', 'ota', 'direct'].map(id => net(compute({m: 1800}), id)), [740000, 744000, 738240]);
});
test('по умолчанию m = 1 800; в зоне А попарный лидер зависит от стороны от 1 812,57', () => {
  assert.equal(compute().m, 1800);
  assert.equal(compute({m: 1800}).pairLeader, 'corporate');
  assert.equal(compute({m: 1850}).pairLeader, 'direct');
  assert.equal(compute({m: 1850}).best, 'ota');
});
test('крайние значения: m = 0 и m = 7 000, границы и мусор', () => {
  assert.equal(compute({m: 0}).best, 'corporate'); assert.equal(net(compute({m: 0}), 'corporate'), 1010000);
  assert.equal(compute({m: 7000}).best, 'direct'); assert.equal(net(compute({m: 7000}), 'corporate'), -40000);
  assert.equal(compute({m: -5}).m, 0); assert.equal(compute({m: 99999}).m, 7000); assert.equal(compute({m: 'x'}).m, 1800);
  assert.deepEqual(compute({m: 1872}).tied.sort(), ['direct', 'ota']);
  assert.equal(compute({m: 1800}).tied.length, 1);
});
