// Виджет «Цена переноса дат» (урок m3l3). Без внешних зависимостей, кроме engine.js.
import {packages, calculate} from '../engine.js';

const ID = 'transfer';
const X_MAX = 150, X_DEFAULT = 140, D_MAX = 1000, D_DEFAULT = 0, D_STEP = 10;
const NB = ' ';

const corp = packages.find(p => p.id === 'corporate');
const direct = packages.find(p => p.id === 'direct');
const MARGIN = 5060;                                    // маржа вытесненной пиковой ночи
const CORP = calculate(corp, {calendar: true});         // before 1 010 000, вытесняется 150
const DIRECT_NET = calculate(direct, {calendar: true}).net; // 705 640
const CORP_NIGHTS = corp.booked * (1 - corp.cancel);    // 300 состоявшихся ночей

/* ---------- расчёт ---------- */
export function compute(params = {}) {
  const rx = Number(params.x), rd = Number(params.d);
  const x = Number.isFinite(rx) ? Math.max(0, rx) : X_DEFAULT;
  const d = Number.isFinite(rd) ? Math.max(0, rd) : D_DEFAULT;
  const xe = Math.min(x, CORP.displaced);                 // вытесняются максимум 150 ночей
  const wasted = x - xe;                                  // перенесено сверх 150: эффекта нет
  const result = at(xe, d);
  const advantage = result - DIRECT_NET;
  const limit = (at(xe, 0) - DIRECT_NET) / CORP_NIGHTS;   // предел скидки при текущем x
  const minX = Math.max(0, Math.ceil(CORP.displaced - (CORP.before - DIRECT_NET) / MARGIN)); // без скидки К ≥ П
  return {x, xe, d, wasted, corporate: result, direct: DIRECT_NET, advantage, limit,
          withoutDiscount: at(xe, 0), discountCost: CORP_NIGHTS * d, minX, remaining: CORP.displaced - xe,
          ahead: advantage >= 0};
}
function at(xe, d) { return CORP.before - MARGIN * (CORP.displaced - xe) - CORP_NIGHTS * d; }

/* ---------- форматирование ---------- */
function num(v, dec = 0) {
  const r = Math.round(Math.abs(v) * 10 ** dec) / 10 ** dec;
  const [i, f] = r.toFixed(dec).split('.');
  return (v < 0 && r !== 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (f ? ',' + f : '');
}
const money = (v, d = 0) => num(v, d) + NB + '₽';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

const CSS = `
.w-transfer{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.45;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin:18px 0;box-sizing:border-box;max-width:100%;overflow:hidden}
.w-transfer *{box-sizing:border-box}
.w-transfer h3{font:700 22px/1.2 Georgia,serif;margin:0 0 4px}
.w-transfer .w-sub{margin:0 0 12px;color:var(--muted);font-size:14px}
.w-transfer .w-head{font:700 20px/1.25 Georgia,serif;margin:0 0 10px;min-height:2.5em}
.w-transfer .w-head.neg{color:var(--orange)}
.w-transfer dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 14px}
.w-transfer dl div{background:var(--paper);border-radius:8px;padding:8px 10px}
.w-transfer dt{font-size:13px;color:var(--muted)}
.w-transfer dd{margin:0;font:700 19px/1.25 Georgia,serif;overflow-wrap:anywhere}
.w-transfer dd.neg{color:var(--orange)}
.w-transfer dd.hi{background:var(--lime);margin:0 -4px;padding:0 4px;border-radius:4px}
.w-transfer .ctl{margin:0 0 6px}
.w-transfer label{display:flex;justify-content:space-between;gap:10px;font-weight:650;font-size:15px}
.w-transfer label output{font-family:Georgia,serif;white-space:nowrap}
.w-transfer input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);cursor:pointer}
.w-transfer button{min-height:44px;padding:8px 14px;border-radius:9px;border:1px solid var(--ink);background:#fff;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
.w-transfer button:focus-visible,.w-transfer input:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.w-transfer h4{margin:12px 0 2px;font:700 16px/1.3 Georgia,serif}
.w-transfer .fig{margin:6px 0 4px}
.w-transfer .fig svg{display:block;width:100%;height:auto;max-width:100%}
.w-transfer .cap{font-size:13px;color:var(--muted);margin:4px 0 12px}
.w-transfer .leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin:4px 0 0}
.w-transfer .leg span{display:inline-flex;align-items:center;gap:6px}
.w-transfer .b{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:2px solid var(--ink);font:700 13px/1 system-ui,sans-serif}
.w-transfer .b-K{background:var(--lime)}
.w-transfer .b-P{background:radial-gradient(#62736d 1.1px,#fff 1.4px) 0 0/5px 5px;text-shadow:0 0 3px #fff,0 0 3px #fff}
.w-transfer .conc{background:var(--paper);border-left:4px solid var(--ink);border-radius:6px;padding:10px 12px;margin:12px 0;font-size:15px}
`;

let uidCounter = 0;

function verdict(r) {
  let first;
  if (r.wasted > 0) {
    first = `Из ${num(r.x)} перенесённых ночей работают только ${num(r.xe)}: вытесняются лишь 150, остальные ничего не добавляют.`;
  } else if (r.advantage >= 0) {
    first = `Корпоративный выше прямого на ${money(r.advantage)}.` + (r.d > 0 ? ` Скидка ${money(r.d)} за ночь стоит ${money(r.discountCost)} и пока не съела выигрыш целиком` : ' Выигрыш полностью зависит от того, сколько пиковых ночей удалось перенести') + (r.limit >= 0 ? `; предел скидки при x = ${num(r.x)} — ${money(r.limit, 2)} за ночь.` : '.');
  } else if (r.d > 0 && r.withoutDiscount >= r.direct) {
    first = `Скидка ${money(r.d)} за ночь (${money(r.discountCost)} на 300 ночей) съела выигрыш: без неё К был бы выше прямого на ${money(r.withoutDiscount - r.direct)}, с ней ниже на ${money(-r.advantage)}. Предел скидки при x = ${num(r.x)} — ${money(r.limit, 2)}.`;
  } else {
    first = `При x = ${num(r.x)} корпоративный ниже прямого на ${money(-r.advantage)} даже без скидки: нужно перенести хотя бы ${num(r.minX)} пиковых ночей.`;
  }
  if (r.wasted === 0 && r.x >= X_MAX) first += ' Перенесены все 150 вытесняемых ночей, дальше переносить нечего.';
  return `${first} Перенос сверх 150 ночей бесполезен: вытесняются только 150. Это граница модели, а не рекомендация.`;
}

export function mount(el, {state = {}, save = () => {}} = {}) {
  const uid = 'wtr' + (++uidCounter);
  const saved = state[ID] && typeof state[ID] === 'object' ? state[ID] : {};
  const clamp = (v, lo, hi, step, def) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v / step) * step)) : def;
  let x = clamp(saved.x, 0, X_MAX, 1, X_DEFAULT), d = clamp(saved.d, 0, D_MAX, D_STEP, D_DEFAULT);

  el.innerHTML = `<div class="w-transfer" id="${uid}"><style>${CSS}</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<pattern id="${uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b44c26" stroke-opacity=".4" stroke-width="2"/></pattern>
<pattern id="${uid}-dots" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#fff"/><circle cx="3.5" cy="3.5" r="1.3" fill="#62736d" fill-opacity=".6"/></pattern>
</defs></svg>
<h3>Цена переноса дат</h3>
<p class="w-sub">Корпоративный пакет = 1${NB}010${NB}000${NB}₽ − 5${NB}060${NB}₽ × (150 − x) − 300 × d. Ориентир: прямой, 705${NB}640${NB}₽.</p>
<div class="w-head" id="${uid}-head" aria-live="polite" aria-atomic="true"></div>
<dl><div><dt>Корпоративный</dt><dd id="${uid}-corp"></dd></div><div><dt>Прямой (ориентир)</dt><dd>${money(DIRECT_NET)}</dd></div>
<div><dt>Преимущество над прямым</dt><dd id="${uid}-adv"></dd></div><div><dt id="${uid}-limt">Предел скидки</dt><dd id="${uid}-lim"></dd></div></dl>
<div class="ctl"><label for="${uid}-x">Перенесено пиковых ночей x <output id="${uid}-xv" for="${uid}-x"></output></label>
<input type="range" id="${uid}-x" min="0" max="${X_MAX}" step="1" value="${x}"></div>
<div class="ctl"><label for="${uid}-d">Скидка d, ₽ за ночь <output id="${uid}-dv" for="${uid}-d"></output></label>
<input type="range" id="${uid}-d" min="0" max="${D_MAX}" step="${D_STEP}" value="${d}"></div>
<h4>Результат корпоративного пакета в зависимости от x</h4>
<div class="fig" id="${uid}-fig"></div>
<div class="leg"><span><i class="b b-K">К</i>корпоративный</span><span><i class="b b-P">П</i>прямой, 705${NB}640${NB}₽</span>
<span><svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="33" y2="5" stroke="#163e37" stroke-width="2.5" stroke-dasharray="5 4"/></svg>за пределом модели</span></div>
<p class="cap">Лаймовая область — выигрыш К над прямым. Штриховая зона справа: сверх 150 ночей вытеснять уже нечего.</p>
<div class="conc" id="${uid}-conc" aria-live="polite" aria-atomic="true"></div>
<button type="button" id="${uid}-reset">Вернуть исходные значения</button></div>`;

  const $ = s => el.querySelector('#' + uid + '-' + s);
  const root = el.querySelector('.w-transfer');
  const ix = $('x'), id_ = $('d');

  function draw(r) {
    const w = Math.max(280, Math.floor($('fig').clientWidth || root.clientWidth - 34 || 320));
    const h = w < 520 ? 270 : 320, L = 40, Rr = 14, T = 16, B = 50, W = w - L - Rr, H = h - T - B;
    const xMax = 200, y0 = -100000, y1 = 1100000;
    const X = v => L + v / xMax * W, Y = v => T + (y1 - v) / (y1 - y0) * H;
    const f = (xe, dd) => at(xe, dd);
    const lvl = f(X_MAX, r.d);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${uid}-t ${uid}-ds" font-family="system-ui,sans-serif"><title id="${uid}-t">Результат корпоративного пакета при переносе x ночей</title><desc id="${uid}-ds">${esc(`Корпоративный при x = ${r.x}, d = ${r.d}: ${money(r.corporate)}; прямой ${money(DIRECT_NET)}; преимущество ${money(r.advantage)}.`)}</desc>`;
    s += `<rect x="${X(150)}" y="${T}" width="${X(xMax) - X(150)}" height="${H}" fill="url(#${uid}-hatch)"/>`;
    for (const v of [0, 250000, 500000, 750000, 1000000]) s += `<line x1="${L}" x2="${w - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#163e37' : '#dbe2d9'}" stroke-width="${v === 0 ? 1.2 : 1}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#62736d">${num(v / 1000)}</text>`;
    s += `<text x="${L + 4}" y="${T + 12}" font-size="12" fill="#62736d">тыс. ₽</text>`;
    // область выигрыша
    const xs = Math.max(0, X_MAX - (CORP.before - DIRECT_NET - CORP_NIGHTS * r.d) / MARGIN);
    if (xs < X_MAX) s += `<polygon points="${X(xs)},${Y(DIRECT_NET)} ${X(X_MAX)},${Y(DIRECT_NET)} ${X(X_MAX)},${Y(lvl)}" fill="#d6ed8c"/>`;
    // граница 150
    s += `<line x1="${X(150)}" x2="${X(150)}" y1="${T}" y2="${T + H}" stroke="#163e37" stroke-width="1.5"/>`;
    s += `<text x="${X(150) - 6}" y="${T + H - 22}" font-size="12" fill="#b44c26" font-weight="700" text-anchor="end">сверх 150 —</text><text x="${X(150) - 6}" y="${T + H - 8}" font-size="12" fill="#b44c26" text-anchor="end">эффекта нет</text>`;
    // прямой
    s += `<line x1="${L}" x2="${w - Rr}" y1="${Y(DIRECT_NET)}" y2="${Y(DIRECT_NET)}" stroke="#62736d" stroke-width="3"/>`;
    // опора: корпоративный при d = 0
    if (r.d > 0) s += `<line x1="${X(0)}" y1="${Y(f(0, 0))}" x2="${X(150)}" y2="${Y(f(150, 0))}" stroke="#62736d" stroke-width="1.5"/><text x="${X(60) }" y="${Y(f(60, 0)) - 8}" font-size="12" fill="#62736d">без скидки</text>`;
    // корпоративный сейчас
    s += `<line x1="${X(0)}" y1="${Y(f(0, r.d))}" x2="${X(150)}" y2="${Y(lvl)}" stroke="#163e37" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<line x1="${X(150)}" y1="${Y(lvl)}" x2="${X(xMax)}" y2="${Y(lvl)}" stroke="#163e37" stroke-width="3.5" stroke-dasharray="6 5"/>`;
    // бейджи
    const badge = (cx, cy, kind) => `<g aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="10" fill="${kind === 'К' ? '#d6ed8c' : `url(#${uid}-dots)`}" stroke="#163e37" stroke-width="2"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#163e37" stroke="#fff" stroke-width="2.5" paint-order="stroke">${kind}</text></g>`;
    s += badge(X(xMax) - 16, Y(DIRECT_NET) - 18, 'П');
    s += badge(X(18), Y(f(18, r.d)), 'К');
    // текущая точка
    const px = X(r.xe), py = Y(r.corporate);
    s += `<line x1="${px}" x2="${px}" y1="${py}" y2="${T + H}" stroke="#b44c26" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${px}" cy="${py}" r="6" fill="#fff" stroke="#b44c26" stroke-width="3"/>`;
    // ось X
    for (const v of [0, 50, 100, 150, 200]) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T + H}" y2="${T + H + 4}" stroke="#62736d"/><text x="${X(v)}" y="${T + H + 19}" text-anchor="middle" font-size="12" fill="#62736d">${v}</text>`;
    s += `<text x="${L + W / 2}" y="${h - 6}" text-anchor="middle" font-size="12" fill="#62736d">x — перенесено пиковых ночей</text></svg>`;
    $('fig').innerHTML = s;
  }

  function update() {
    const r = compute({x, d});
    ix.value = x; id_.value = d;
    $('xv').textContent = `${num(x)} из 150`;
    $('dv').textContent = money(d);
    ix.setAttribute('aria-valuetext', `${x} из 150 ночей`);
    id_.setAttribute('aria-valuetext', money(d));
    const head = $('head');
    head.className = 'w-head' + (r.ahead ? '' : ' neg');
    head.textContent = r.ahead
      ? `Корпоративный ${money(r.corporate)}: выше прямого на ${money(r.advantage)}`
      : `Корпоративный ${money(r.corporate)}: ниже прямого на ${money(-r.advantage)}`;
    $('corp').textContent = money(r.corporate);
    const adv = $('adv'); adv.textContent = (r.advantage > 0 ? '+' : '') + money(r.advantage); adv.className = r.ahead ? 'hi' : 'neg';
    $('limt').textContent = `Предел скидки при x = ${num(x)}`;
    $('lim').textContent = r.limit >= 0 ? `${money(r.limit, 2)} за ночь` : 'нет: и без скидки ниже прямого';
    $('conc').innerHTML = '<strong>Вывод:</strong> ' + esc(verdict(r));
    draw(r);
  }
  const persist = () => { state[ID] = {x, d}; save(); };
  ix.addEventListener('input', () => { x = Number(ix.value); state[ID] = {x, d}; update(); });
  id_.addEventListener('input', () => { d = Number(id_.value); state[ID] = {x, d}; update(); });
  ix.addEventListener('change', persist); id_.addEventListener('change', persist);
  $('reset').addEventListener('click', () => { x = X_DEFAULT; d = D_DEFAULT; update(); persist(); });
  update();
  if (typeof ResizeObserver !== 'undefined') {
    let last = 0;
    new ResizeObserver(() => { const w = $('fig').clientWidth; if (w && Math.abs(w - last) > 1) { last = w; draw(compute({x, d})); } }).observe(root);
  }
  return {update};
}
