// Виджет «Барьер или скидка» (урок m2p). Без внешних зависимостей.
const ID = 'barrier';
const BOOKINGS = 100, PRICE = 6200, COST = 1800, RESELL = 0.4;
const DEFAULTS = {flexCancel: 20, nrCancel: 5, discount: 10};
const LIMITS = {flexCancel: [0, 40], nrCancel: [0, 15], discount: [0, 20]};
const NB = ' ';

/* ---------- расчёт ---------- */
// Все три параметра — проценты (20 = 20 %).
export function compute(params = {}) {
  const get = k => { const v = Number(params[k]); return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULTS[k]; };
  const flexCancel = get('flexCancel'), nrCancel = get('nrCancel'), discount = get('discount');
  const cancelled = BOOKINGS * flexCancel / 100;
  const flexCompleted = BOOKINGS - cancelled + RESELL * cancelled;
  const flexMargin = flexCompleted * (PRICE - COST);
  const nrPrice = PRICE * (1 - discount / 100);
  const nrRevenue = BOOKINGS * nrPrice;
  const nrCompleted = BOOKINGS - BOOKINGS * nrCancel / 100;
  const nrMargin = nrRevenue - nrCompleted * COST;
  const diff = nrMargin - flexMargin;
  // доля отмен гибкого, при которой маржи равны: (100 − 0,6·c)·(цена − затраты) = маржа невозвратного
  const breakeven = (BOOKINGS - nrMargin / (PRICE - COST)) / (BOOKINGS * (1 - RESELL) / 100);
  const tol = flexMargin * 0.005; // в пределах 0,5 % считаем ничьей
  const verdict = Math.abs(diff) <= tol ? 'tie' : diff > 0 ? 'barrier' : 'flex';
  const status = breakeven < 0 ? 'always' : breakeven > 100 ? 'never' : breakeven > LIMITS.flexCancel[1] ? 'beyond' : 'inside';
  return {flexCancel, nrCancel, discount, flexCompleted, flexMargin, nrPrice, nrRevenue, nrCompleted, nrMargin, diff, breakeven, status, verdict};
}

/* ---------- форматирование ---------- */
function num(v, dec = 0) {
  const r = Math.round(Math.abs(v) * 10 ** dec) / 10 ** dec;
  const [i, f] = r.toFixed(dec).split('.');
  return (v < 0 && r !== 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (f ? ',' + f : '');
}
const money = (v, d = 0) => num(v, d) + NB + '₽';
const nights = v => num(v, Math.abs(v - Math.round(v)) < 0.005 ? 0 : 1);
const pct = (v, d = 0) => num(v, d) + NB + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

const CSS = `
.w-barrier{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.45;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin:18px 0;box-sizing:border-box;max-width:100%;overflow:hidden}
.w-barrier *{box-sizing:border-box}
.w-barrier h3{font:700 22px/1.2 Georgia,serif;margin:0 0 4px}
.w-barrier .w-sub{margin:0 0 12px;color:var(--muted);font-size:14px}
.w-barrier .w-head{font:700 20px/1.25 Georgia,serif;margin:0 0 10px;min-height:2.5em}
.w-barrier .w-head.neg{color:var(--orange)}
.w-barrier .tbl-wrap{overflow-x:auto;margin:0 0 10px}.w-barrier table{width:100%;border-collapse:collapse;font-size:14px;margin:0}@media(max-width:480px){.w-barrier table{font-size:12.5px}.w-barrier th,.w-barrier td{padding:6px 4px!important}}
.w-barrier th,.w-barrier td{padding:7px 6px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}
.w-barrier td.n{text-align:right;white-space:nowrap;font-family:Georgia,serif;font-size:16px}
.w-barrier th.n{text-align:right}
.w-barrier tr.diff th,.w-barrier tr.diff td{border-bottom:0;font-weight:700}
.w-barrier tr.diff td.n.neg{color:var(--orange)}
.w-barrier tr.diff td.n.pos{background:var(--lime)}
.w-barrier .pk{display:flex;align-items:center}
.w-barrier .sw{flex:none;display:inline-block;width:18px;height:14px;border:2px solid var(--ink);border-radius:3px;margin-right:7px;vertical-align:-2px}
.w-barrier .sw-f{background:var(--ink)}
.w-barrier .sw-n{background:repeating-linear-gradient(45deg,#fff 0 3px,#8fa59a 3px 5px)}
.w-barrier .be{background:var(--paper);border-radius:8px;padding:8px 10px;margin:0 0 14px;font-size:14px}
.w-barrier .be strong{font-family:Georgia,serif;font-size:17px}
.w-barrier .ctl{margin:0 0 6px}
.w-barrier label{display:flex;justify-content:space-between;gap:10px;font-weight:650;font-size:15px}
.w-barrier label output{font-family:Georgia,serif;white-space:nowrap}
.w-barrier input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);cursor:pointer}
.w-barrier button{min-height:44px;padding:8px 14px;border-radius:9px;border:1px solid var(--ink);background:#fff;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
.w-barrier button:focus-visible,.w-barrier input:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.w-barrier h4{margin:12px 0 2px;font:700 16px/1.3 Georgia,serif}
.w-barrier .fig{margin:6px 0 4px}
.w-barrier .fig svg{display:block;width:100%;height:auto;max-width:100%}
.w-barrier .cap{font-size:13px;color:var(--muted);margin:4px 0 12px}
.w-barrier .conc{background:var(--paper);border-left:4px solid var(--ink);border-radius:6px;padding:10px 12px;margin:12px 0;font-size:15px}
`;

let uidCounter = 0;

function verdictText(r) {
  const be = r.status === 'inside' || r.status === 'beyond' ? pct(r.breakeven, 1) : null;
  const where = r.status === 'inside' ? `Безубыточность — отмены гибкого около ${be}: при ${pct(r.flexCancel)} ${r.flexCancel < r.breakeven ? 'это ниже порога, поэтому выигрывает гибкий' : 'это выше порога, поэтому выигрывает барьер'}.`
    : r.status === 'beyond' ? `Барьер окупился бы лишь при отменах гибкого около ${be}, то есть за пределами ползунка (до 40${NB}%).`
    : r.status === 'always' ? 'Барьер окупается уже при нулевых отменах гибкого.'
    : 'Ни при каких отменах гибкого такой барьер не окупается.';
  let main;
  if (r.verdict === 'tie') main = `Почти ничья: невозвратный отличается от гибкого на ${money(r.diff)}. Скидка ${pct(r.discount)} съедает почти всё, что дают меньшие отмены, так что барьер здесь ничего не даёт.`;
  else if (r.verdict === 'barrier') main = `Барьер окупается: невозвратный выше гибкого на ${money(r.diff)}. Меньшие отмены (${pct(r.nrCancel)} против ${pct(r.flexCancel)}) перекрывают скидку ${pct(r.discount)}.`;
  else main = `Скидка дороже отмен: гибкий выше невозвратного на ${money(-r.diff)}. Отмены гибкого (${pct(r.flexCancel)}) частично возвращаются перепродажей, а скидка ${pct(r.discount)} теряется на каждой ночи.`;
  return `${main} ${where} Модель не учитывает, как условия отмены меняют спрос.`;
}

export function mount(el, {state = {}, save = () => {}} = {}) {
  const uid = 'wba' + (++uidCounter);
  const saved = state[ID] && typeof state[ID] === 'object' ? state[ID] : {};
  const val = k => { const v = Number(saved[k]); return Number.isFinite(v) ? Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(v))) : DEFAULTS[k]; };
  let p = {flexCancel: val('flexCancel'), nrCancel: val('nrCancel'), discount: val('discount')};

  const slider = (k, label, id) => `<div class="ctl"><label for="${uid}-${id}">${label} <output id="${uid}-${id}v" for="${uid}-${id}"></output></label><input type="range" id="${uid}-${id}" min="${LIMITS[k][0]}" max="${LIMITS[k][1]}" step="1" value="${p[k]}"></div>`;
  el.innerHTML = `<div class="w-barrier" id="${uid}"><style>${CSS}</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<pattern id="${uid}-hn" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#163e37" stroke-opacity=".45" stroke-width="2"/></pattern>
<pattern id="${uid}-ho" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b44c26" stroke-opacity=".4" stroke-width="2"/></pattern>
</defs></svg>
<h3>Барьер или скидка</h3>
<p class="w-sub">100 бронирований непиковой ночи по 6${NB}200${NB}₽, затраты 1${NB}800${NB}₽ на состоявшуюся ночь. У гибкого 40${NB}% отменённых ночей перепродаются.</p>
<div class="w-head" id="${uid}-head" aria-live="polite" aria-atomic="true"></div>
<div class="tbl-wrap" tabindex="0" role="region" aria-label="Таблица маржи тарифов"><table><caption style="position:absolute;left:-9999px">Маржа гибкого и невозвратного тарифа</caption>
<thead><tr><th scope="col">Тариф</th><th scope="col" class="n">Состоялось ночей</th><th scope="col" class="n">Маржа</th></tr></thead>
<tbody><tr><th scope="row"><div class="pk"><i class="sw sw-f" aria-hidden="true"></i>Гибкий</div></th><td class="n" id="${uid}-fc"></td><td class="n" id="${uid}-fm"></td></tr>
<tr><th scope="row"><div class="pk"><i class="sw sw-n" aria-hidden="true"></i><span>Невозвратный, <span id="${uid}-np"></span></span></div></th><td class="n" id="${uid}-nc"></td><td class="n" id="${uid}-nm"></td></tr>
<tr class="diff"><th scope="row" colspan="2">Разница (невозвратный − гибкий)</th><td class="n" id="${uid}-df"></td></tr></tbody></table></div>
<div class="be" id="${uid}-be"></div>
${slider('flexCancel', 'Отмены гибкого', 'f')}${slider('nrCancel', 'Отмены невозвратного', 'n')}${slider('discount', 'Скидка невозвратного', 'd')}
<h4>Маржа тарифов</h4>
<div class="fig" id="${uid}-bars"></div>
<h4>Когда барьер окупается: разница в зависимости от отмен гибкого</h4>
<div class="fig" id="${uid}-line"></div>
<p class="cap">Заливка выше нуля — барьер выгоднее, штриховая ниже нуля — выгоднее гибкий. Пунктир — точка безубыточности: она зависит от допущений об отменах.</p>
<div class="conc" id="${uid}-conc" aria-live="polite" aria-atomic="true"></div>
<button type="button" id="${uid}-reset">Вернуть исходные значения</button></div>`;

  const $ = s => el.querySelector('#' + uid + '-' + s);
  const root = el.querySelector('.w-barrier');
  const inputs = {flexCancel: $('f'), nrCancel: $('n'), discount: $('d')};
  const outs = {flexCancel: $('fv'), nrCancel: $('nv'), discount: $('dv')};

  function drawBars(r) {
    const w = Math.max(280, Math.floor($('bars').clientWidth || root.clientWidth - 34 || 320));
    const max = 460000, L = 0, Rr = 8, BW = w - L - Rr - 92, h = 126;
    const x = v => L + v / max * BW;
    const row = (label, v, y, fill, name) => `<text x="${L}" y="${y}" font-size="13" font-weight="700" fill="#163e37">${label}</text><rect x="${L + 1}" y="${y + 6}" width="${Math.max(2, x(v) - 2)}" height="26" fill="${fill}" stroke="#163e37" stroke-width="2"/><text x="${x(v) + 6}" y="${y + 25}" font-size="13" font-weight="700" fill="#163e37" font-family="Georgia,serif">${money(v)}</text>`;
    $('bars').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${uid}-bt ${uid}-bd" font-family="system-ui,sans-serif"><title id="${uid}-bt">Маржа гибкого и невозвратного тарифов</title><desc id="${uid}-bd">${esc(`Гибкий ${money(r.flexMargin)}, невозвратный ${money(r.nrMargin)}, разница ${money(r.diff)}.`)}</desc>
${row('Гибкий', r.flexMargin, 18, '#163e37')}${row('Невозвратный', r.nrMargin, 70, `url(#${uid}-hn)`)}</svg>`;
  }

  function drawLine(r) {
    const w = Math.max(280, Math.floor($('line').clientWidth || root.clientWidth - 34 || 320));
    const h = w < 520 ? 260 : 300, L = 44, Rr = 14, T = 24, B = 46, W = w - L - Rr, H = h - T - B;
    const f = c => r.nrMargin - ((BOOKINGS - (1 - RESELL) * c) * (PRICE - COST));
    const d0 = f(0), d1 = f(40);
    let hi = Math.max(0, d0, d1), lo = Math.min(0, d0, d1);
    const raw = (hi - lo) / 4, step = [10000, 20000, 25000, 50000, 100000].find(s => s >= raw) || 100000;
    hi = Math.ceil((hi + step * 0.2) / step) * step; lo = Math.floor((lo - step * 0.2) / step) * step;
    const X = c => L + c / 40 * W, Y = v => T + (hi - v) / (hi - lo) * H;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${uid}-lt ${uid}-ld" font-family="system-ui,sans-serif"><title id="${uid}-lt">Разница маржи невозвратного и гибкого</title><desc id="${uid}-ld">${esc(`Разница растёт вместе с отменами гибкого от ${money(d0)} при 0 % до ${money(d1)} при 40 %. ` + (r.status === 'inside' ? `Ноль при ${pct(r.breakeven, 1)}. ` : '') + `Сейчас отмены гибкого ${pct(r.flexCancel)}, разница ${money(r.diff)}.`)}</desc>`;
    // зоны выше/ниже нуля, обрезанные линией
    const pts = [[0, d0], [40, d1]];
    const poly = (above) => {
      // многоугольник между линией и нулевой осью с нужной стороны
      const z = r.breakeven > 0 && r.breakeven < 40 ? r.breakeven : null;
      const seg = [];
      const push = (c, v) => seg.push(`${X(c)},${Y(v)}`);
      const sideOK = v => above ? v >= 0 : v <= 0;
      if (z === null) {
        if (!sideOK(d0) && !sideOK(d1)) return '';
        push(0, 0); push(0, d0); push(40, d1); push(40, 0);
      } else {
        const a = sideOK(d0);
        if (a) { push(0, 0); push(0, d0); push(z, 0); } else { push(z, 0); push(40, d1); push(40, 0); }
      }
      return seg.join(' ');
    };
    const up = poly(true), down = poly(false);
    if (up) s += `<polygon points="${up}" fill="#d6ed8c"/>`;
    if (down) s += `<polygon points="${down}" fill="url(#${uid}-ho)"/>`;
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1; v += step) s += `<line x1="${L}" x2="${w - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#163e37' : '#dbe2d9'}" stroke-width="${v === 0 ? 1.5 : 1}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#62736d">${num(v / 1000)}</text>`;
    s += `<text x="2" y="12" font-size="12" fill="#62736d">тыс. ₽</text>`;
    s += `<text x="${w - Rr - 4}" y="${T + 28}" text-anchor="end" font-size="12" font-weight="700" fill="#163e37">↑ барьер выгоднее</text><text x="${L + 4}" y="${T + H - 8}" font-size="12" font-weight="700" fill="#b44c26">↓ выгоднее гибкий</text>`;
    s += `<line x1="${X(0)}" y1="${Y(d0)}" x2="${X(40)}" y2="${Y(d1)}" stroke="#163e37" stroke-width="3.5" stroke-linecap="round"/>`;
    if (r.status === 'inside') s += `<line x1="${X(r.breakeven)}" x2="${X(r.breakeven)}" y1="${T}" y2="${T + H}" stroke="#163e37" stroke-width="2" stroke-dasharray="5 4"/>`;
    const cx = X(r.flexCancel), cy = Y(r.diff);
    s += `<line x1="${cx}" x2="${cx}" y1="${cy}" y2="${T + H}" stroke="#b44c26" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="6" fill="#fff" stroke="#b44c26" stroke-width="3"/>`;
    for (const c of [0, 10, 20, 30, 40]) s += `<line x1="${X(c)}" x2="${X(c)}" y1="${T + H}" y2="${T + H + 4}" stroke="#62736d"/><text x="${X(c)}" y="${T + H + 19}" text-anchor="middle" font-size="12" fill="#62736d">${c}%</text>`;
    if (r.status === 'inside') {
      const lab = (w < 520 ? '' : 'безубыточность ') + pct(r.breakeven, 1), bx = X(r.breakeven), tw = 6.6 * lab.length + 6, flip = bx + tw + 6 > w - Rr;
      s += `<text x="${flip ? bx - 5 : bx + 5}" y="${T + 12}" text-anchor="${flip ? 'end' : 'start'}" font-size="12" font-weight="700" fill="#163e37">${lab}</text>`;
    }
    s += `<text x="${L + W / 2}" y="${h - 4}" text-anchor="middle" font-size="12" fill="#62736d">доля отмен гибкого</text></svg>`;
    $('line').innerHTML = s;
  }

  function update() {
    const r = compute(p);
    for (const k of Object.keys(p)) { inputs[k].value = p[k]; outs[k].textContent = pct(p[k]); inputs[k].setAttribute('aria-valuetext', pct(p[k])); }
    const head = $('head');
    head.className = 'w-head' + (r.verdict === 'flex' ? ' neg' : '');
    head.textContent = r.verdict === 'tie' ? `Практически поровну: разница ${money(r.diff)}`
      : r.verdict === 'barrier' ? `Невозвратный выше гибкого на ${money(r.diff)}`
      : `Невозвратный ниже гибкого на ${money(-r.diff)}`;
    $('fc').textContent = nights(r.flexCompleted);
    $('fm').textContent = money(r.flexMargin);
    $('np').textContent = `цена ${money(r.nrPrice)}`;
    $('nc').textContent = nights(r.nrCompleted);
    $('nm').textContent = money(r.nrMargin);
    const df = $('df'); df.textContent = (r.diff > 0 ? '+' : '') + money(r.diff); df.className = 'n ' + (r.diff < 0 ? 'neg' : r.diff > 0 ? 'pos' : '');
    $('be').innerHTML = r.status === 'inside' ? `Барьер окупается при отменах гибкого от <strong>${pct(r.breakeven, 1)}</strong> (сейчас ${pct(r.flexCancel)}).`
      : r.status === 'beyond' ? `Барьер окупается при отменах гибкого от <strong>${pct(r.breakeven, 1)}</strong> — за пределом ползунка (до 40${NB}%).`
      : r.status === 'always' ? 'Барьер окупается <strong>при любых отменах гибкого</strong>, даже нулевых.'
      : 'Барьер <strong>не окупается</strong> ни при каких отменах гибкого.';
    $('conc').innerHTML = '<strong>Вывод:</strong> ' + esc(verdictText(r));
    drawBars(r); drawLine(r);
  }
  const persist = () => { state[ID] = {...p}; save(); };
  for (const k of Object.keys(inputs)) {
    inputs[k].addEventListener('input', () => { p[k] = Number(inputs[k].value); state[ID] = {...p}; update(); });
    inputs[k].addEventListener('change', persist);
  }
  $('reset').addEventListener('click', () => { p = {...DEFAULTS}; update(); persist(); });
  update();
  if (typeof ResizeObserver !== 'undefined') {
    let last = 0;
    new ResizeObserver(() => { const w = $('bars').clientWidth; if (w && Math.abs(w - last) > 1) { last = w; const r = compute(p); drawBars(r); drawLine(r); } }).observe(root);
  }
  return {update};
}
