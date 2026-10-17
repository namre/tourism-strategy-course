import test from 'node:test';
import assert from 'node:assert/strict';
import {compute, render, mount} from '../widgets/capacity-band.js';
import {packages, calculate} from '../engine.js';

test('capacity-band: вытеснение при базовом спросе 370 — 90 / 10 / 150', () => {
  assert.deepEqual(['ota', 'direct', 'corporate'].map(pkg => compute({basePeak: 370, pkg}).displaced), [90, 10, 150]);
  assert.deepEqual(['ota', 'direct', 'corporate'].map(pkg => compute({basePeak: 370, pkg}).net), [450600, 705640, 251000]);
});

test('capacity-band: свободно, прогноз, потеря', () => {
  const c = compute({basePeak: 370, pkg: 'ota'});
  assert.equal(c.free, 30);
  assert.equal(c.forecast, 170);
  assert.equal(c.confirmed, 200);
  assert.equal(c.capacity, 400);
  assert.equal(c.loss, 90 * 5060);
  assert.equal(c.fits + c.displaced, c.peak);
});

test('capacity-band: буквы А/П/К принимаются как идентификаторы', () => {
  assert.equal(compute({pkg: 'А'}).pkg, 'ota');
  assert.equal(compute({pkg: 'П'}).pkg, 'direct');
  assert.equal(compute({pkg: 'К'}).pkg, 'corporate');
});

test('capacity-band: крайние значения basePeak', () => {
  // 200: вся свободная мощность 200 ≥ любого пика (180) — вытеснения нет
  for (const pkg of ['ota', 'direct', 'corporate']) {
    const c = compute({basePeak: 200, pkg});
    assert.equal(c.displaced, 0);
    assert.equal(c.free, 200);
    assert.equal(c.forecast, 0);
  }
  // 400: свободного нет, вытесняется весь пик
  assert.deepEqual(['ota', 'direct', 'corporate'].map(pkg => compute({basePeak: 400, pkg}).displaced), [120, 40, 180]);
  // за пределами диапазона — обрезка; нечисло — значение по умолчанию
  assert.equal(compute({basePeak: 999}).basePeak, 400);
  assert.equal(compute({basePeak: 0}).basePeak, 200);
  assert.equal(compute({basePeak: NaN}).basePeak, 370);
});

test('capacity-band: совпадает с engine.calculate на всём диапазоне', () => {
  for (let b = 200; b <= 400; b++) for (const p of packages) {
    const r = calculate(p, {calendar: true, basePeak: b}), c = compute({basePeak: b, pkg: p.id});
    assert.equal(c.displaced, r.displaced);
    assert.equal(c.net, r.net);
    assert.ok(c.displaced <= b - 200);
    assert.equal(c.free, 400 - b);
  }
});

test('capacity-band: render пишет вывод с неразрывными пробелами', () => {
  const el = {innerHTML: ''};
  render(el, {basePeak: 370, pkg: 'ota'});
  assert.match(el.innerHTML, /пакет А вытесняет 90 ночей базового спроса — потеря 90 × 5 060 ₽ = 455 400 ₽/);
  assert.match(el.innerHTML, /class="w-capacity-band"/);
  render(el, {basePeak: 200, pkg: 'direct'});
  assert.match(el.innerHTML, /не вытесняет/);
});

test('capacity-band: mount экспортируется функцией', () => {
  assert.equal(typeof mount, 'function');
});
