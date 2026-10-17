// Виджет «Живая полоса мощности»: как пакет вытесняет базовый спрос в пиковые ночи.
// compute() — чистая функция по формуле engine.calculate; render() — встраиваемый рисунок; mount() — виджет с ползунком и переключателем.
import {packages, calculate} from '../engine.js';

export const ID = 'capacity-band';
export const CAPACITY = 400;
export const CONFIRMED = 200;
export const MARGIN = 5060;
export const DEFAULTS = {basePeak: 370, pkg: 'ota'};

const NB = ' ';
const META = {
  ota: {letter: 'А', short: 'Агрегатор', cls: 'ota'},
  direct: {letter: 'П', short: 'Прямой', cls: 'direct'},
  corporate: {letter: 'К', short: 'Корпоративный', cls: 'corporate'}
};
const ALIAS = {'А': 'ota', 'A': 'ota', 'П': 'direct', 'P': 'direct', 'К': 'corporate', 'K': 'corporate'};

const int = n => {
  const r = Math.round(n);
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
};
const rub = n => int(n) + NB + '₽';
const pl = (n, f) => {
  const m = Math.abs(n) % 100, d = m % 10;
  return m > 10 && m < 20 ? f[2] : d === 1 ? f[0] : d > 1 && d < 5 ? f[1] : f[2];
};
const nights = n => int(n) + NB + pl(n, ['ночь', 'ночи', 'ночей']);

function resolvePkg(pkg) {
  const id = ALIAS[pkg] || pkg;
  return packages.find(p => p.id === id) || packages[0];
}

/** params: {basePeak: 200–400 (370), pkg: 'ota'|'direct'|'corporate' или А/П/К, margin: ₽ (5 060)} */
export function compute({basePeak = DEFAULTS.basePeak, pkg = DEFAULTS.pkg, margin = MARGIN} = {}) {
  const p = resolvePkg(pkg);
  let bp = Number(basePeak);
  if (!Number.isFinite(bp)) bp = DEFAULTS.basePeak;
  bp = Math.min(CAPACITY, Math.max(CONFIRMED, bp));
  const r = calculate(p, {calendar: true, margin, basePeak: bp});
  const free = CAPACITY - bp;
  return {
    pkg: p.id, name: p.name, letter: META[p.id].letter,
    capacity: CAPACITY, confirmed: CONFIRMED, basePeak: bp,
    forecast: bp - CONFIRMED,       // прогноз базового спроса = basePeak − 200
    free,                           // свободно до пакета
    peak: p.peak,                   // пиковые ночи пакета
    fits: p.peak - r.displaced,     // поместилось в свободную мощность
    freeLeft: Math.max(0, free - p.peak),
    displaced: r.displaced,         // вытеснено ночей базового спроса
    loss: r.displaced * margin,     // потеря от вытеснения
    before: r.before,
    net: r.net,                     // результат после вытеснения
    margin
  };
}

const CSS = `
.w-capacity-band,.w-capacity-band *{box-sizing:border-box}
.w-capacity-band{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;max-width:720px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;min-width:0}
.w-capacity-band h3{font:600 18px/1.25 Georgia,serif;letter-spacing:0;margin:0 0 12px}
.w-capacity-band .cb-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}
.w-capacity-band .cb-stat{background:var(--paper);border-radius:9px;padding:8px 10px;min-width:0}
.w-capacity-band .cb-stat span{display:block;font-size:12px;line-height:1.3;color:var(--muted)}
.w-capacity-band .cb-stat strong{display:block;font:600 22px/1.2 Georgia,serif;white-space:nowrap}
.w-capacity-band .cb-stat.bad strong{color:var(--orange)}
.w-capacity-band .cb-row{font-size:13px;color:var(--muted);margin:10px 0 5px}
.w-capacity-band .cb-row b{color:var(--ink)}
.w-capacity-band .cb-track{position:relative;height:40px;border-radius:6px;background:#fff}
.w-capacity-band .cb-band{display:flex;height:100%;border:1px solid var(--ink);border-radius:6px;overflow:hidden}
.w-capacity-band .cb-seg{height:100%;min-width:0}
.w-capacity-band .cb-conf{background:var(--ink)}
.w-capacity-band .cb-fore{background:repeating-linear-gradient(135deg,#fff 0 6px,#e9efe5 6px 8px);border:2px dashed var(--ink)}
.w-capacity-band .cb-free{background:var(--lime)}
.w-capacity-band .cb-pk{position:absolute;top:0;height:100%;display:flex;border:2px solid var(--ink);border-radius:6px;overflow:hidden;background:#fff}
.w-capacity-band .cb-pk i{display:block;height:100%;min-width:0}
.w-capacity-band .cb-pk .fit{background-color:var(--lime);background-image:var(--img);background-size:var(--sz)}
.w-capacity-band .cb-pk .dis{background-color:var(--orange);background-image:var(--img2);background-size:var(--sz)}
.w-capacity-band .cb-pk.ota{--img:none;--img2:none;--sz:auto}
.w-capacity-band .cb-pk.direct{--img:radial-gradient(circle,#163e37 1.6px,transparent 2.2px);--img2:radial-gradient(circle,#fff 1.6px,transparent 2.2px);--sz:9px 9px}
.w-capacity-band .cb-pk.corporate{--img:repeating-linear-gradient(45deg,#163e37 0 2px,transparent 2px 8px);--img2:repeating-linear-gradient(45deg,#fff 0 2px,transparent 2px 8px);--sz:auto}
.w-capacity-band .cb-axis{position:relative;height:20px;margin-top:3px;font-size:12px;color:var(--muted)}
.w-capacity-band .cb-axis span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.w-capacity-band .cb-axis span:first-child{transform:none}
.w-capacity-band .cb-axis span:last-child{transform:translateX(-100%)}
.w-capacity-band .cb-legend{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;font-size:13px}
.w-capacity-band .cb-legend li{display:flex;gap:8px;align-items:center}
.w-capacity-band .cb-sw{flex:none;width:22px;height:14px;border:1px solid var(--ink);border-radius:3px}
.w-capacity-band .cb-sw.conf{background:var(--ink)}
.w-capacity-band .cb-sw.fore{background:repeating-linear-gradient(135deg,#fff 0 4px,#e9efe5 4px 6px);border:2px dashed var(--ink)}
.w-capacity-band .cb-sw.free{background:var(--lime)}
.w-capacity-band .cb-sw.dis{background:var(--orange);border-color:var(--orange)}
.w-capacity-band .cb-badge{flex:none;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ink);color:#fff;font:700 15px/1 Georgia,serif}
.w-capacity-band fieldset{border:0;margin:16px 0 0;padding:0;min-width:0}
.w-capacity-band legend{font-size:13px;font-weight:650;padding:0;margin-bottom:6px}
.w-capacity-band .cb-pkgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.w-capacity-band .cb-pkgs label{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;padding:8px 4px;border:1px solid var(--line);border-radius:10px;cursor:pointer;text-align:center;font-size:13px;line-height:1.2;background:#fff;margin:0}
.w-capacity-band .cb-pkgs input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer;width:100%;height:100%}
.w-capacity-band .cb-pkgs label:has(input:checked){background:var(--lime);border:2px solid var(--ink);font-weight:650}
.w-capacity-band .cb-pkgs label:has(input:focus-visible){outline:3px solid var(--orange);outline-offset:2px}
.w-capacity-band .cb-range{margin-top:16px}
.w-capacity-band .cb-range label{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:650;margin:0 0 2px}
.w-capacity-band .cb-range output{font-family:Georgia,serif;white-space:nowrap}
.w-capacity-band input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);background:transparent}
.w-capacity-band .cb-hint{font-size:12px;color:var(--muted);margin:0}
.w-capacity-band .cb-verdict{margin:14px 0 0;padding:12px 14px;border-left:3px solid var(--ink);background:#eaf0df;border-radius:0 9px 9px 0;font-size:15px;max-width:none}
.w-capacity-band .cb-verdict.bad{border-left-color:var(--orange);background:#fbeee8}
.w-capacity-band .cb-verdict b{font-weight:700}
.w-capacity-band .cb-reset{margin-top:12px;min-height:44px;padding:0 18px;border:1px solid #aab9ae;border-radius:9px;background:transparent;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
.w-capacity-band .cb-reset:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
@media(max-width:420px){.w-capacity-band{padding:14px}.w-capacity-band .cb-pkgs label{font-size:12px}.w-capacity-band .cb-stat strong{font-size:19px}}
`;

function figureHTML(c) {
  const m = META[c.pkg];
  const pct = n => (n / c.capacity * 100).toFixed(3) + '%';
  const pkLeft = (c.capacity - c.peak) / c.capacity;
  return `<div class="cb-stats" aria-live="polite">
  <div class="cb-stat"><span>Свободно до пакета</span><strong>${int(c.free)}</strong></div>
  <div class="cb-stat ${c.displaced ? 'bad' : ''}"><span>Вытеснено ночей</span><strong>${int(c.displaced)}</strong></div>
  <div class="cb-stat"><span>Результат пакета</span><strong>${rub(c.net)}</strong></div>
</div>
<div class="cb-row"><b>Пик, мощность ${c.capacity} ночей</b> — что уже занято и что ожидается</div>
<div class="cb-track" role="img" aria-label="Мощность пика ${c.capacity} ночей: подтверждено ${c.confirmed}, прогноз базового спроса ${c.forecast}, свободно ${c.free}">
  <div class="cb-band">
    <div class="cb-seg cb-conf" style="width:${pct(c.confirmed)}"></div>
    ${c.forecast ? `<div class="cb-seg cb-fore" style="width:${pct(c.forecast)}"></div>` : ''}
    ${c.free ? `<div class="cb-seg cb-free" style="width:${pct(c.free)}"></div>` : ''}
  </div>
</div>
<div class="cb-row" style="display:flex;align-items:center;gap:8px"><span class="cb-badge" aria-hidden="true">${m.letter}</span><b>Пакет ${m.letter}: ${nights(c.peak)} в пик</b></div>
<div class="cb-track" role="img" aria-label="Пакет ${m.letter} занимает ${c.peak} пиковых ночей: ${c.fits} в свободной мощности, ${c.displaced} вытесняют базовый спрос">
  <div class="cb-pk ${m.cls}" style="left:${(pkLeft * 100).toFixed(3)}%;width:${pct(c.peak)}">
    ${c.displaced ? `<i class="dis" style="width:${(c.displaced / c.peak * 100).toFixed(3)}%"></i>` : ''}${c.fits ? `<i class="fit" style="width:${(c.fits / c.peak * 100).toFixed(3)}%"></i>` : ''}
  </div>
</div>
<div class="cb-axis" aria-hidden="true"><span style="left:0">0</span><span style="left:50%">${c.confirmed}</span><span style="left:100%">${c.capacity}</span></div>
<ul class="cb-legend">
  <li><i class="cb-sw conf"></i>Подтверждено: ${c.confirmed} (сплошная заливка)</li>
  <li><i class="cb-sw fore"></i>Прогноз базового спроса: ${c.forecast} (штрих — не доказано)</li>
  <li><i class="cb-sw free"></i>Свободно: ${c.free}</li>
  <li><i class="cb-sw dis"></i>Вытеснено пакетом: ${c.displaced}</li>
</ul>`;
}

function verdictHTML(c) {
  const m = META[c.pkg];
  if (c.displaced > 0) {
    return `<b>Вывод:</b> пакет ${m.letter} вытесняет ${nights(c.displaced)} базового спроса — потеря ${int(c.displaced)}${NB}×${NB}${int(c.margin)}${NB}₽ = ${rub(c.loss)}.`;
  }
  return `<b>Вывод:</b> пакет ${m.letter} помещается в свободную мощность и не вытесняет базовый спрос — потеря 0${NB}₽.`;
}

function ensureStyle(el) {
  return `<style>${CSS}</style>`;
}

/** Встраиваемый рисунок (без элементов управления): render(el, {basePeak, pkg}) */
export function render(el, {basePeak = DEFAULTS.basePeak, pkg = DEFAULTS.pkg, margin = MARGIN} = {}) {
  const c = compute({basePeak, pkg, margin});
  el.innerHTML = ensureStyle(el) + `<div class="w-capacity-band"><h3>Живая полоса мощности</h3>${figureHTML(c)}<p class="cb-verdict ${c.displaced ? 'bad' : ''}" aria-live="polite">${verdictHTML(c)}</p></div>`;
  return c;
}

export function mount(el, {state = {}, save = () => {}} = {}) {
  const st = state[ID] = Object.assign({}, DEFAULTS, state[ID]);
  if (!META[st.pkg]) st.pkg = DEFAULTS.pkg;
  st.basePeak = compute({basePeak: st.basePeak}).basePeak;
  const uid = ID + '-' + Math.random().toString(36).slice(2, 7);
  el.innerHTML = `<style>${CSS}</style><div class="w-capacity-band">
  <h3>Живая полоса мощности</h3>
  <div data-fig></div>
  <fieldset><legend>Пакет</legend><div class="cb-pkgs" role="radiogroup">
    ${Object.entries(META).map(([id, m]) => `<label><input type="radio" name="${uid}" value="${id}"><span class="cb-badge" aria-hidden="true">${m.letter}</span><span>${m.short}</span></label>`).join('')}
  </div></fieldset>
  <div class="cb-range"><label for="${uid}-bp"><span>Базовый спрос в пик</span><output data-bpv for="${uid}-bp"></output></label>
    <input id="${uid}-bp" type="range" min="${CONFIRMED}" max="${CAPACITY}" step="1">
    <p class="cb-hint">От ${CONFIRMED} (только подтверждённое) до ${CAPACITY} (вся мощность). Ползунок меняет допущение, а не прогнозирует рынок.</p></div>
  <p class="cb-verdict" data-verdict aria-live="polite"></p>
  <button type="button" class="cb-reset">Вернуть исходные значения</button>
</div>`;
  const q = s => el.querySelector(s);
  const range = q('input[type=range]');
  const radios = [...el.querySelectorAll('input[type=radio]')];
  function update() {
    const c = compute({basePeak: st.basePeak, pkg: st.pkg});
    q('[data-fig]').innerHTML = figureHTML(c);
    const v = q('[data-verdict]');
    v.innerHTML = verdictHTML(c);
    v.classList.toggle('bad', c.displaced > 0);
    q('[data-bpv]').textContent = int(st.basePeak) + NB + pl(st.basePeak, ['ночь', 'ночи', 'ночей']);
    range.value = st.basePeak;
    range.setAttribute('aria-valuetext', int(st.basePeak) + ' ' + pl(st.basePeak, ['ночь', 'ночи', 'ночей']));
    radios.forEach(r => { r.checked = r.value === st.pkg; });
  }
  range.addEventListener('input', () => { st.basePeak = Number(range.value); save(); update(); });
  radios.forEach(r => r.addEventListener('change', () => { if (r.checked) { st.pkg = r.value; save(); update(); } }));
  q('.cb-reset').addEventListener('click', () => { Object.assign(st, DEFAULTS); save(); update(); });
  update();
}
