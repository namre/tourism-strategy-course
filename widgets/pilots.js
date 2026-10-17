// Виджет «Двадцать пилотов»: при малой выборке один и тот же эффект даёт разные знаки.
// compute({n, effect, seed}) — детерминированная биномиальная симуляция (effect в процентных пунктах).
// analyticWrongSignShare(n, p0, effect) — нормальное приближение (p0 и effect в долях: 0,05 и 0,01).

export const ID = 'pilots';
export const PILOTS = 20;
export const P0 = 0.05;
export const DEFAULTS = {n: 100, effect: 1, seed: 0};

const NB = ' ';
const fmt = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',').replace('-', '−');
const pct = x => fmt(x * 100) + NB + '%';

/** Детерминированный ГПСЧ mulberry32. */
export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function binomial(n, p, rnd) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rnd() < p) k++;
  return k;
}

// Функция ошибок (Абрамовиц–Стиган 7.1.26, погрешность < 1,5e-7) и стандартное нормальное распределение.
function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export const normalCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));

// p0 > 1 понимаем как проценты (5 и 1 → 0,05 и 0,01).
function normFractions(p0, effect) {
  if (p0 > 1) return [p0 / 100, effect / 100];
  return [p0, effect];
}

function sdOfDiff(n, p0, p1) {
  return Math.sqrt((p0 * (1 - p0) + p1 * (1 - p1)) / n);
}

/** Теоретическая доля пилотов с обратным знаком: P(разница < 0). n — размер каждой группы. */
export function analyticWrongSignShare(n, p0 = P0, effect = 0.01) {
  [p0, effect] = normFractions(p0, effect);
  const p1 = Math.min(1, p0 + effect);
  const sd = sdOfDiff(n, p0, p1);
  if (sd === 0) return effect > 0 ? 0 : 0.5;
  return normalCdf(-effect / sd);
}

/** Теоретическая доля пилотов, где разница больше удвоенного истинного эффекта. */
export function analyticBigShare(n, p0 = P0, effect = 0.01) {
  [p0, effect] = normFractions(p0, effect);
  const p1 = Math.min(1, p0 + effect);
  const sd = sdOfDiff(n, p0, p1);
  if (sd === 0) return 0;
  return 1 - normalCdf(effect / sd);
}

/**
 * params: {n: 30–1000 (100) — размер каждой группы, effect: 0–3 п. п. (1), seed: целое (1), p0: конверсия контроля (0,05)}
 * Возвращает {diffs: 20 разниц конверсий в п. п., wrongShare, bigShare, ...}.
 * Неверный знак = строго отрицательная разница. Ничьи (разница 0) считаются отдельно (zeroCount);
 * нормальное приближение делит ничьи пополам, поэтому сопоставимо с wrongShare + zeroShare / 2.
 * При effect = 0 «неверного знака» нет: wrongShare и bigShare равны null.
 */
export function compute({n = DEFAULTS.n, effect = DEFAULTS.effect, seed = 1, p0 = P0} = {}) {
  n = Math.max(1, Math.round(Number(n) || DEFAULTS.n));
  effect = Math.max(0, Number(effect) || 0);
  seed = Math.round(Number(seed) || 0);
  const p1 = Math.min(1, p0 + effect / 100);
  const rnd = mulberry32(seed * 7919 + 12345);
  const diffs = [];
  for (let i = 0; i < PILOTS; i++) {
    const c = binomial(n, p0, rnd);
    const t = binomial(n, p1, rnd);
    diffs.push((t - c) / n * 100);
  }
  const wrong = diffs.filter(d => d < 0).length;
  const big = diffs.filter(d => d > 2 * effect).length;
  const zero = diffs.filter(d => d === 0).length;
  const hasEffect = effect > 0;
  return {
    n, effect, seed, p0, p1, diffs,
    wrongCount: wrong, bigCount: hasEffect ? big : null, zeroCount: zero,
    wrongShare: hasEffect ? wrong / PILOTS : null,
    zeroShare: zero / PILOTS,
    bigShare: hasEffect ? big / PILOTS : null,
    analyticWrong: hasEffect ? analyticWrongSignShare(n, p0, effect / 100) : 0.5,
    analyticBig: hasEffect ? analyticBigShare(n, p0, effect / 100) : null
  };
}

const CSS = `
.w-pilots,.w-pilots *{box-sizing:border-box}
.w-pilots{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;max-width:720px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;min-width:0}
.w-pilots h3{font:600 18px/1.25 Georgia,serif;letter-spacing:0;margin:0 0 12px}
.w-pilots .pl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}
.w-pilots .pl-stat{background:var(--paper);border-radius:9px;padding:8px 10px;min-width:0}
.w-pilots .pl-stat span{display:block;font-size:12px;line-height:1.3;color:var(--muted)}
.w-pilots .pl-stat strong{display:block;font:600 22px/1.2 Georgia,serif;white-space:nowrap}
.w-pilots .pl-stat small{display:block;font-size:12px;color:var(--muted)}
.w-pilots .pl-stat.bad strong{color:var(--orange)}
.w-pilots svg{display:block;width:100%;height:auto;max-width:520px;margin:0 auto}
.w-pilots svg text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;fill:#163e37}
.w-pilots .pl-legend{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13px}
.w-pilots .pl-legend li{display:flex;gap:8px;align-items:center}
.w-pilots .pl-legend svg{flex:none;width:22px;height:18px;margin:0}
.w-pilots details{margin:10px 0 0;font-size:13px;background:transparent;border:0;border-top:1px solid var(--line);border-radius:0;padding:0}
.w-pilots summary{cursor:pointer;min-height:32px;display:flex;align-items:center;font-weight:600}
.w-pilots summary:focus-visible,.w-pilots button:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
.w-pilots ol{columns:2;margin:6px 0 0;padding-left:28px}
.w-pilots .pl-run{display:block;width:100%;min-height:48px;margin:14px 0 0;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:#fff;font:650 16px system-ui,sans-serif;cursor:pointer}
.w-pilots .pl-run:hover{filter:brightness(1.15)}
.w-pilots .pl-range{margin-top:12px}
.w-pilots .pl-range label{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:650;margin:0 0 2px}
.w-pilots .pl-range output{font-family:Georgia,serif;white-space:nowrap}
.w-pilots input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);background:transparent}
.w-pilots .pl-hint{font-size:12px;color:var(--muted);margin:2px 0 0}
.w-pilots .pl-verdict{margin:14px 0 0;padding:12px 14px;border-left:3px solid var(--orange);background:#fbeee8;border-radius:0 9px 9px 0;max-width:none}
.w-pilots .pl-reset{margin-top:12px;min-height:44px;padding:0 18px;border:1px solid #aab9ae;border-radius:9px;background:transparent;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
@media(max-width:420px){.w-pilots{padding:14px}.w-pilots .pl-stat strong{font-size:19px}}
`;

function ordinalEvery(share) {
  const k = Math.round(1 / share);
  return k;
}

export function verdictText(n, effect) {
  const tail = ' — до запуска решите размер групп и правило решения.';
  if (effect <= 0) {
    return `<b>Вывод:</b> эффекта нет, но при n${NB}=${NB}${n} примерно каждый 2-й пилот всё равно покажет «рост»${tail}`;
  }
  const share = analyticWrongSignShare(n, P0, effect / 100);
  const k = ordinalEvery(share);
  if (k >= 50) {
    return `<b>Вывод:</b> при n${NB}=${NB}${n} обратный знак почти не встречается (реже одного пилота из 50)${tail}`;
  }
  return `<b>Вывод:</b> при n${NB}=${NB}${n} примерно каждый ${k}-й пилот показывает обратный знак${tail}`;
}

const W = 360, X0 = 16, X1 = 344, ROW = 15, TOP = 26;

function pickLimit(c) {
  const sd = sdOfDiff(c.n, c.p0, c.p1) * 100;
  const need = c.seed ? Math.max(...c.diffs.map(Math.abs), c.effect * 2) : Math.max(sd * 2.5, c.effect * 2);
  return [4, 6, 10, 15, 20, 30].find(l => l >= need + 0.3) || 40;
}

function plotSVG(c) {
  const run = c.seed > 0;
  const L = pickLimit(c);
  const H = TOP + PILOTS * ROW + 46;
  const x = v => X0 + (v + L) / (2 * L) * (X1 - X0);
  const xz = x(0);
  const ticks = {4: [-4, -2, 0, 2, 4], 6: [-6, -3, 0, 3, 6], 10: [-10, -5, 0, 5, 10], 15: [-15, -10, -5, 0, 5, 10, 15], 20: [-20, -10, 0, 10, 20], 30: [-30, -15, 0, 15, 30]}[L] || [-L, -L / 2, 0, L / 2, L];
  const yb = TOP + PILOTS * ROW + 4;
  let g = `<rect x="${X0}" y="${TOP - 6}" width="${xz - X0}" height="${PILOTS * ROW + 8}" fill="#b44c26" fill-opacity=".09"/>`;
  g += `<text x="${xz - 6}" y="14" font-size="12" text-anchor="end" style="fill:#b44c26">← обратный знак</text><text x="${xz + 6}" y="14" font-size="12">верный знак →</text>`;
  g += `<line x1="${xz}" y1="${TOP - 6}" x2="${xz}" y2="${yb + 4}" stroke="#163e37" stroke-width="2"/>`;
  if (c.effect > 0 && x(c.effect) < X1) {
    g += `<line x1="${x(c.effect)}" y1="${TOP - 6}" x2="${x(c.effect)}" y2="${yb + 4}" stroke="#163e37" stroke-width="2" stroke-dasharray="5 4"/>`;
  }
  g += `<line x1="${X0}" y1="${yb + 4}" x2="${X1}" y2="${yb + 4}" stroke="#163e37" stroke-width="1"/>`;
  for (const t of ticks) {
    const lab = t === 0 ? '0' : (t > 0 ? '+' : '−') + fmt(Math.abs(t), 1);
    g += `<line x1="${x(t)}" y1="${yb + 4}" x2="${x(t)}" y2="${yb + 9}" stroke="#163e37"/><text x="${x(t)}" y="${yb + 23}" font-size="12" text-anchor="middle">${lab}</text>`;
  }
  g += `<text x="${(X0 + X1) / 2}" y="${yb + 40}" font-size="12" text-anchor="middle" style="fill:#62736d">разница конверсий, п. п. (с изменением − контроль)</text>`;
  if (run) {
    c.diffs.forEach((d, i) => {
      const cx = x(d), cy = TOP + i * ROW + ROW / 2 - 1;
      const wrong = d < 0, big = c.effect > 0 && d > 2 * c.effect;
      if (big) g += `<circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="#163e37" stroke-width="1.5"/>`;
      g += wrong
        ? `<rect x="${cx - 4.5}" y="${cy - 4.5}" width="9" height="9" fill="#b44c26" transform="rotate(45 ${cx} ${cy})"/>`
        : d === 0 ? `<circle cx="${cx}" cy="${cy}" r="4" fill="#fff" stroke="#163e37" stroke-width="2"/>`
        : `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#163e37"/>`;
    });
  } else {
    g += `<text x="${(X0 + X1) / 2}" y="${TOP + PILOTS * ROW / 2}" font-size="14" text-anchor="middle" style="fill:#62736d">Нажмите «Запустить 20 пилотов»</text>`;
  }
  const label = run
    ? `Разницы конверсий 20 пилотов при n = ${c.n}: обратный знак у ${c.wrongCount}.`
    : 'Ось разницы конверсий, пилоты ещё не запущены.';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${g}</svg>`;
}

function legendHTML(c) {
  return `<ul class="pl-legend" aria-hidden="false">
  <li><svg viewBox="0 0 22 18"><circle cx="11" cy="9" r="4.5" fill="#163e37"/></svg>Пилот: знак верный (один пилот — одна строка)</li>
  <li><svg viewBox="0 0 22 18"><circle cx="11" cy="9" r="4" fill="#fff" stroke="#163e37" stroke-width="2"/></svg>Пилот: разницы нет (0)</li>
  <li><svg viewBox="0 0 22 18"><rect x="6.5" y="4.5" width="9" height="9" fill="#b44c26" transform="rotate(45 11 9)"/></svg>Пилот: обратный знак</li>
  <li><svg viewBox="0 0 22 18"><circle cx="11" cy="9" r="7.5" fill="none" stroke="#163e37" stroke-width="1.5"/><circle cx="11" cy="9" r="3" fill="#163e37"/></svg>Эффект больше вдвое против истинного</li>
  <li><svg viewBox="0 0 22 18"><line x1="11" y1="1" x2="11" y2="17" stroke="#163e37" stroke-width="2" stroke-dasharray="4 3"/></svg>Истинный эффект: ${fmt(c.effect, 2)}${NB}п.${NB}п. (штрих)</li>
</ul>`;
}

function statsHTML(c) {
  const run = c.seed > 0;
  const hasE = c.effect > 0;
  const wrongTxt = run && hasE ? `${c.wrongCount} из ${PILOTS}` : '—';
  const bigTxt = run && hasE ? `${c.bigCount} из ${PILOTS}` : '—';
  return `<div class="pl-stats" aria-live="polite">
  <div class="pl-stat ${run && hasE && c.wrongCount ? 'bad' : ''}"><span>Обратный знак</span><strong>${wrongTxt}</strong><small>${run && hasE ? pct(c.wrongShare) + (c.zeroCount ? ', без разницы: ' + c.zeroCount : '') : hasE ? 'ещё не запускали' : 'эффекта нет'}</small></div>
  <div class="pl-stat"><span>Эффект больше вдвое</span><strong>${bigTxt}</strong><small>${run && hasE ? pct(c.bigShare) : hasE ? 'ещё не запускали' : 'эффекта нет'}</small></div>
  <div class="pl-stat"><span>По теории: обратный знак</span><strong>${hasE ? pct(c.analyticWrong) : '≈' + NB + '50' + NB + '%'}</strong><small>${hasE ? 'ничьи пополам' : 'знак случаен'}</small></div>
</div>`;
}

function listHTML(c) {
  if (!c.seed) return '';
  return `<details><summary>Значения всех 20 пилотов</summary><ol>${c.diffs.map(d => `<li>${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d), 1)} п.${NB}п.${d < 0 ? ' (обратный знак)' : d === 0 ? ' (нет разницы)' : ''}</li>`).join('')}</ol></details>`;
}

export function mount(el, {state = {}, save = () => {}} = {}) {
  const st = state[ID] = Object.assign({}, DEFAULTS, state[ID]);
  st.n = Math.min(1000, Math.max(30, Math.round(Number(st.n) || DEFAULTS.n)));
  st.effect = Math.min(3, Math.max(0, Number(st.effect)));
  if (!Number.isFinite(st.effect)) st.effect = DEFAULTS.effect;
  st.seed = Math.max(0, Math.round(Number(st.seed) || 0));
  const uid = ID + '-' + Math.random().toString(36).slice(2, 7);
  el.innerHTML = `<style>${CSS}</style><div class="w-pilots">
  <h3>Двадцать пилотов</h3>
  <div data-stats></div>
  <div data-plot></div>
  <div data-legend></div>
  <div data-list></div>
  <button type="button" class="pl-run">Запустить 20 пилотов</button>
  <div class="pl-range"><label for="${uid}-n"><span>Размер каждой группы, n</span><output for="${uid}-n" data-nv></output></label>
    <input id="${uid}-n" type="range" min="30" max="1000" step="10"></div>
  <div class="pl-range"><label for="${uid}-e"><span>Истинный эффект</span><output for="${uid}-e" data-ev></output></label>
    <input id="${uid}-e" type="range" min="0" max="3" step="0.25">
    <p class="pl-hint">Допустим, конверсия в контрольной группе 5${NB}%. Эффект — рост в процентных пунктах (п.${NB}п.).</p></div>
  <p class="pl-verdict" data-verdict aria-live="polite"></p>
  <button type="button" class="pl-reset">Вернуть исходные значения</button>
</div>`;
  const q = s => el.querySelector(s);
  const rn = q(`#${uid}-n`), re = q(`#${uid}-e`);
  function update() {
    const c = compute({n: st.n, effect: st.effect, seed: st.seed});
    q('[data-stats]').innerHTML = statsHTML(c);
    q('[data-plot]').innerHTML = plotSVG(c);
    q('[data-legend]').innerHTML = legendHTML(c);
    q('[data-list]').innerHTML = listHTML(c);
    q('[data-nv]').textContent = 'n' + NB + '=' + NB + st.n;
    q('[data-ev]').textContent = (st.effect > 0 ? '+' : '') + fmt(st.effect, 2) + NB + 'п.' + NB + 'п.';
    rn.value = st.n; re.value = st.effect;
    rn.setAttribute('aria-valuetext', 'n = ' + st.n);
    re.setAttribute('aria-valuetext', fmt(st.effect, 2) + ' процентного пункта');
    q('[data-verdict]').innerHTML = verdictText(st.n, st.effect);
  }
  q('.pl-run').addEventListener('click', () => { st.seed += 1; save(); update(); });
  rn.addEventListener('input', () => { st.n = Number(rn.value); save(); update(); });
  re.addEventListener('input', () => { st.effect = Number(re.value); save(); update(); });
  q('.pl-reset').addEventListener('click', () => { Object.assign(st, DEFAULTS); save(); update(); });
  update();
}
