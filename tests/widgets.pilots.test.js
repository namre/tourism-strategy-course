import test from 'node:test';
import assert from 'node:assert/strict';
import {compute, analyticWrongSignShare, analyticBigShare, verdictText, mount} from '../widgets/pilots.js';

test('pilots: аналитика — n = 100, 5 % → 6 % даёт ≈ 0,38', () => {
  const s = analyticWrongSignShare(100, 0.05, 0.01);
  assert.ok(Math.abs(s - 0.378) < 0.005, String(s));
  // проценты тоже понимаются
  assert.ok(Math.abs(analyticWrongSignShare(100, 5, 1) - s) < 1e-12);
});

test('pilots: аналитика монотонна по n и по эффекту', () => {
  let prev = 1;
  for (const n of [30, 100, 300, 1000]) {
    const s = analyticWrongSignShare(n, 0.05, 0.01);
    assert.ok(s < prev); prev = s;
  }
  assert.ok(analyticWrongSignShare(1000, 0.05, 0.03) < 0.01);
  assert.ok(analyticWrongSignShare(30, 0.05, 0.01) > 0.4);
  assert.ok(Math.abs(analyticWrongSignShare(100, 0.05, 0) - 0.5) < 1e-9);
  assert.ok(analyticBigShare(100, 0.05, 0.01) > 0.3);
});

test('pilots: compute детерминирован и возвращает 20 разниц', () => {
  const a = compute({n: 100, effect: 1, seed: 7}), b = compute({n: 100, effect: 1, seed: 7});
  assert.deepEqual(a, b);
  assert.equal(a.diffs.length, 20);
  assert.ok(a.diffs.every(Number.isFinite));
  assert.ok(a.wrongShare >= 0 && a.wrongShare <= 1);
  assert.equal(a.wrongShare, a.diffs.filter(d => d < 0).length / 20);
  assert.equal(a.bigShare, a.diffs.filter(d => d > 2).length / 20);
  assert.notDeepEqual(a.diffs, compute({n: 100, effect: 1, seed: 8}).diffs);
});

test('pilots: симуляция согласуется с теорией (усреднение по 300 запускам)', () => {
  for (const [n, eff] of [[100, 1], [30, 1], [1000, 1]]) {
    let wrong = 0, ties = 0, total = 0;
    for (let seed = 1; seed <= 300; seed++) { const c = compute({n, effect: eff, seed}); wrong += c.wrongCount; ties += c.zeroCount; total += 20; }
    const sim = (wrong + ties / 2) / total, th = analyticWrongSignShare(n, 0.05, eff / 100);
    assert.ok(Math.abs(sim - th) < 0.04, `n=${n}: sim=${sim} theory=${th}`);
  }
});

test('pilots: крайние значения', () => {
  const big = compute({n: 1000, effect: 3, seed: 3});
  assert.ok(big.wrongShare <= 0.1);
  const zero = compute({n: 100, effect: 0, seed: 1});
  assert.equal(zero.wrongShare, null);
  assert.equal(zero.bigShare, null);
  assert.equal(zero.diffs.length, 20);
  const small = compute({n: 30, effect: 3, seed: 5});
  assert.equal(small.diffs.length, 20);
  assert.ok(small.diffs.every(d => Math.abs(d) <= 100));
  // зерно 0 не ломается
  assert.equal(compute({n: 100, effect: 1, seed: 0}).diffs.length, 20);
});

test('pilots: формулировка вывода', () => {
  assert.match(verdictText(100, 1), /при n = 100 примерно каждый 3-й пилот показывает обратный знак — до запуска решите размер групп и правило решения/);
  assert.match(verdictText(1000, 3), /почти не встречается/);
  assert.match(verdictText(100, 0), /каждый 2-й/);
  assert.equal(typeof mount, 'function');
});
