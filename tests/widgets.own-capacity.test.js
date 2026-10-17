import test from 'node:test';
import assert from 'node:assert/strict';
import {compute, PRESETS, mount} from '../widgets/own-capacity.js';

const trail = PRESETS.trail, bus = PRESETS.bus;
const args = (p, group) => ({capacity: p.capacity, demand: p.demand, price: p.price, groupPrice: p.groupPrice, cost: p.cost, group});

test('own-capacity: Экотропа, группа 30 → 304 000 против 340 000', () => {
  const c = compute(args(trail, 30));
  assert.equal(c.valid, true);
  assert.equal(c.sold, 70);
  assert.equal(c.displaced, 30);
  assert.equal(c.result, 70 * 3400 + 30 * 2200);
  assert.equal(c.result, 304000);
  assert.equal(c.baseline, 340000);
  assert.equal(c.delta, -36000);
});

test('own-capacity: без группы результат равен базовому', () => {
  const c = compute(args(trail, 0));
  assert.equal(c.result, c.baseline);
  assert.equal(c.displaced, 0);
  assert.equal(c.baseline, 100 * 3400);
});

test('own-capacity: группа 50 на тропе', () => {
  const c = compute(args(trail, 50));
  assert.equal(c.sold, 50);
  assert.equal(c.displaced, 50);
  assert.equal(c.result, 50 * 3400 + 50 * 2200);
});

test('own-capacity: автобус 45 мест, спрос 50', () => {
  const c0 = compute(args(bus, 0));
  assert.equal(c0.baseline, 45 * 3000);
  const c = compute(args(bus, 15));
  assert.equal(c.sold, 30);
  assert.equal(c.displaced, 15);
  assert.equal(c.result, 30 * 3000 + 15 * 2000);
  assert.equal(c.delta, -15000);
});

test('own-capacity: спрос ниже мощности — группа не вытесняет', () => {
  const c = compute({capacity: 100, demand: 40, price: 4000, groupPrice: 2800, cost: 600, group: 30});
  assert.equal(c.displaced, 0);
  assert.equal(c.empty, 30);
  assert.equal(c.delta, 30 * 2200);
});

test('own-capacity: ограничения и пустые поля', () => {
  assert.equal(compute({}).valid, false);
  assert.equal(compute({capacity: '', demand: 10, price: 1, groupPrice: 1, cost: 0, group: 0}).valid, false);
  assert.equal(compute({capacity: 0, demand: 10, price: 1, groupPrice: 1, cost: 0, group: 0}).valid, false);
  assert.equal(compute({capacity: 10, demand: 10, price: -1, groupPrice: 1, cost: 0, group: 0}).valid, false);
  // группа больше мощности обрезается
  const c = compute({capacity: 10, demand: 20, price: 100, groupPrice: 50, cost: 0, group: 99});
  assert.equal(c.group, 10);
  assert.equal(c.sold, 0);
  // числа в виде строк из полей ввода
  assert.equal(compute({capacity: '100', demand: '140', price: '4000', groupPrice: '2800', cost: '600', group: '30'}).result, 304000);
  assert.equal(typeof mount, 'function');
});
