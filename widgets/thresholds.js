// Виджет «Три прямые и зоны» (урок m3l2). Без внешних зависимостей, кроме engine.js.
import {packages, calculate} from '../engine.js';

const ID = 'thresholds';
const M_MAX = 7000, M_DEFAULT = 1800, M_STEP = 10, BASE_PEAK = 370;
const ORDER = ['ota', 'direct', 'corporate'];
const META = {
  ota: {letter: 'А', name: 'Агрегатор'},
  direct: {letter: 'П', name: 'Прямой'},
  corporate: {letter: 'К', name: 'Корпоративный'}
};
const NB = ' ';

/* ---------- расчёт ---------- */
// Результат пакета при цене вытесненной пиковой ночи m: net = before − вытеснено·m.
export function compute(params = {}) {
  const raw = Number(params.m);
  const m = Number.isFinite(raw) ? Math.min(M_MAX, Math.max(0, raw)) : M_DEFAULT;
  const basePeak = Number.isFinite(Number(params.basePeak)) ? Number(params.basePeak) : BASE_PEAK;
  const rows = ORDER.map(id => {
    const p = packages.find(x => x.id === id);
    const r = calculate(p, {calendar: true, margin: m, basePeak});
    return {id, letter: META[id].letter, name: META[id].name, before: r.before, displaced: r.displaced, net: r.net};
  });
  const maxNet = Math.max(...rows.map(r => r.net));
  const tied = rows.filter(r => Math.abs(r.net - maxNet) < 0.005).map(r => r.id);
  const best = tied.length > 1 ? (tied.includes('corporate') ? 'corporate' : tied[0]) : tied[0];
  const row = id => rows.find(r => r.id === id);
  const cross = (a, b) => {
    const A = row(a), B = row(b);
    return A.displaced === B.displaced ? null : (A.before - B.before) / (A.displaced - B.displaced);
  };
  const thresholds = {
    KA: cross('corporate', 'ota'),   // К → А
    AP: cross('ota', 'direct'),      // А → П
    KP: cross('corporate', 'direct') // попарное равенство К и П
  };
  // зоны лучшего пакета на [0, M_MAX]
  const pts = new Set([0, M_MAX]);
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const t = cross(rows[i].id, rows[j].id);
    if (t !== null && t > 0 && t < M_MAX) pts.add(t);
  }
  const xs = [...pts].sort((a, b) => a - b), zones = [];
  for (let k = 0; k < xs.length - 1; k++) {
    const mid = (xs[k] + xs[k + 1]) / 2;
    const id = rows.reduce((b, r) => (r.before - r.displaced * mid > b.before - b.displaced * mid ? r : b)).id;
    if (zones.length && zones[zones.length - 1].id === id) zones[zones.length - 1].to = xs[k + 1];
    else zones.push({id, from: xs[k], to: xs[k + 1]});
  }
  const zone = (zones.find(z => m >= z.from && m < z.to) || zones[zones.length - 1]).id;
  const pairLeader = m === thresholds.KP ? 'tie' : (m < thresholds.KP ? 'corporate' : 'direct'); // кто лучше в паре К–П
  return {m, basePeak, rows, best, tied, zone, zones, thresholds, pairLeader};
}

/* ---------- форматирование ---------- */
function num(v, dec = 0) {
  const r = Math.round(Math.abs(v) * 10 ** dec) / 10 ** dec;
  const [i, f] = r.toFixed(dec).split('.');
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (f ? ',' + f : '');
  return (v < 0 && r !== 0 ? '−' : '') + s;
}
const money = (v, d = 0) => num(v, d) + NB + '₽';

/* ---------- стили ---------- */
const CSS = `
.w-thresholds{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.45;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin:18px 0;box-sizing:border-box;max-width:100%;overflow:hidden}
.w-thresholds *{box-sizing:border-box}
.w-thresholds h3{font:700 22px/1.2 Georgia,serif;margin:0 0 4px}
.w-thresholds .w-sub{margin:0 0 12px;color:var(--muted);font-size:14px}
.w-thresholds .w-head{font:700 20px/1.25 Georgia,serif;margin:0 0 10px;min-height:2.5em}
.w-thresholds table{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 14px}
.w-thresholds th,.w-thresholds td{padding:7px 6px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}
.w-thresholds td.n,.w-thresholds th.n{text-align:right;white-space:nowrap}
.w-thresholds .pk{display:flex;align-items:center}
.w-thresholds .nm{display:flex;flex-direction:column;align-items:flex-start}
.w-thresholds .nm small{font-weight:400;color:var(--muted);font-size:12.5px}
.w-thresholds td.n{font-family:Georgia,serif;font-size:16px}
.w-thresholds tr.best td,.w-thresholds tr.best th{background:var(--lime)}
.w-thresholds .neg{color:var(--orange)}
.w-thresholds .tag{display:inline-block;font-size:12px;font-weight:700;border:1px solid var(--ink);border-radius:20px;padding:0 7px;margin-left:6px;background:#fff;white-space:nowrap}
.w-thresholds .b{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:2px solid var(--ink);font:700 13px/1 system-ui,sans-serif;vertical-align:middle;margin-right:7px;flex:none;color:var(--ink)}
.w-thresholds .b-K{background:var(--lime)}
.w-thresholds .b-A{background:repeating-linear-gradient(45deg,#fff 0 3px,#bccfba 3px 5px)}
.w-thresholds .b-P{background:radial-gradient(#62736d 1.1px,#fff 1.4px) 0 0/5px 5px}
.w-thresholds .b-A,.w-thresholds .b-P{text-shadow:0 0 3px #fff,0 0 3px #fff}
.w-thresholds .ctl{margin:0 0 12px}
.w-thresholds label{display:flex;justify-content:space-between;gap:10px;font-weight:650;font-size:15px}
.w-thresholds label output{font-family:Georgia,serif;white-space:nowrap}
.w-thresholds input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);cursor:pointer}
.w-thresholds .btns{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 12px}
.w-thresholds button{min-height:44px;padding:8px 14px;border-radius:9px;border:1px solid var(--ink);background:#fff;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
.w-thresholds button[aria-pressed=true]{background:var(--ink);color:#fff}
.w-thresholds button.reset{background:#fff}
.w-thresholds button:focus-visible,.w-thresholds input:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.w-thresholds .fig{margin:6px 0 14px}
.w-thresholds .fig svg{display:block;width:100%;height:auto;max-width:100%;touch-action:pan-y}
.w-thresholds .cap{font-size:13px;color:var(--muted);margin:4px 0 0}
.w-thresholds .leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin:6px 0 0;color:var(--ink)}
.w-thresholds .leg span{display:inline-flex;align-items:center}
.w-thresholds .conc{background:var(--paper);border-left:4px solid var(--ink);border-radius:6px;padding:10px 12px;margin:0 0 12px;font-size:15px}
.w-thresholds .conc strong{font-family:Georgia,serif}
.w-thresholds h4{margin:12px 0 2px;font:700 16px/1.3 Georgia,serif}
`;

let uidCounter = 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const KEY = {ota: 'A', direct: 'P', corporate: 'K'};

/* ---------- вывод ---------- */
function verdictText(r) {
  const t = r.thresholds, m = money(r.m);
  const win = r.rows.find(x => x.id === r.best);
  const sorted = [...r.rows].sort((a, b) => b.net - a.net);
  const gap = sorted[0].net - sorted[1].net;
  if (r.tied.length > 1) {
    return `При m = ${m} два пакета дают одинаковый результат: это граница лучшего решения (${money(t.KA, 2)} или ${money(t.AP)}). Чуть в любую сторону лучшим станет один из них.`;
  }
  if (r.zone === 'corporate') {
    return `<strong>Лучший — К (корпоративный)</strong>: при m = ${m} он опережает ближайший пакет на ${money(gap)}. У него больше всего вытесняется пиковых ночей (150), но пока ночь стоит меньше ${money(t.KA, 2)}, это вытеснение дешевле, чем недобор А и П до вытеснения.`;
  }
  if (r.zone === 'ota') {
    const pair = r.pairLeader === 'corporate'
      ? `попарно К ещё лучше П`
      : `попарно П уже лучше К`;
    return `<strong>Лучший — А (агрегатор)</strong>, отрыв ${money(gap)}. Здесь ${pair}: пара К–П равна при ${money(t.KP, 2)}, но эта точка лежит внутри зоны А, где лучшим остаётся А. Попарный порог ≠ граница лучшего решения: границы — ${num(t.KA, 2)} (К → А) и ${num(t.AP)} (А → П).`;
  }
  return `<strong>Лучший — П (прямой)</strong>: при m = ${m} он опережает ближайший пакет на ${money(gap)}. Он вытесняет меньше всего (10 ночей), поэтому выигрывает, когда пиковая ночь дорога, — выше ${money(t.AP)}. Порог К–П (${num(t.KP, 2)}) уже пройден, но решающим был порог А–П.`;
}

/* ---------- монтирование ---------- */
export function mount(el, {state = {}, save = () => {}} = {}) {
  const uid = 'wth' + (++uidCounter);
  const saved = state[ID] && typeof state[ID] === 'object' ? state[ID] : null;
  let m = saved && Number.isFinite(saved.m) ? Math.min(M_MAX, Math.max(0, Math.round(saved.m / M_STEP) * M_STEP)) : M_DEFAULT;

  el.innerHTML = `<div class="w-thresholds" id="${uid}">
<style>${CSS}</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<pattern id="${uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#eef2ec"/><line x1="0" y1="0" x2="0" y2="7" stroke="#163e37" stroke-opacity=".35" stroke-width="2"/></pattern>
<pattern id="${uid}-dots" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#fff"/><circle cx="3.5" cy="3.5" r="1.3" fill="#62736d" fill-opacity=".45"/></pattern>
</defs></svg>
<h3>Три прямые и зоны</h3>
<p class="w-sub">Результат пакета = результат до вытеснения − вытесненные пиковые ночи × m. Базовый спрос пика — 370 ночей.</p>
<div class="w-head" id="${uid}-head" aria-live="polite" aria-atomic="true"></div>
<table><caption class="w-sr" style="position:absolute;left:-9999px">Результаты пакетов при выбранной m</caption>
<thead><tr><th scope="col">Пакет</th><th scope="col" class="n">Результат</th></tr></thead><tbody id="${uid}-rows"></tbody></table>
<div class="ctl"><label for="${uid}-m">Маржа вытесненной пиковой ночи m <output id="${uid}-mv" for="${uid}-m"></output></label>
<input type="range" id="${uid}-m" min="0" max="${M_MAX}" step="${M_STEP}" value="${m}"></div>
<div class="btns" role="group" aria-label="Быстрые значения m">
<button type="button" data-m="1000">m = 1${NB}000</button><button type="button" data-m="1800">m = 1${NB}800</button><button type="button" data-m="3000">m = 3${NB}000</button></div>
<h4>Результат пакетов в зависимости от m</h4>
<div class="fig" id="${uid}-main"></div>
<h4>Увеличение: узкая зона А, ${num(1650)}–${num(1950)} ₽</h4>
<div class="fig" id="${uid}-zoom"></div>
<div class="leg" id="${uid}-leg"><span><i class="b b-K">К</i>корпоративный</span><span><i class="b b-A">А</i>агрегатор</span><span><i class="b b-P">П</i>прямой</span><span><svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="33" y2="5" stroke="#163e37" stroke-width="2" stroke-dasharray="5 4"/></svg>&nbsp;пунктир: К и П равны</span></div>
<p class="cap">Заливка зон: сплошная — К лучше, диагональ — А лучше, точки — П лучше. Сплошные вертикали — границы лучшего решения.</p>
<div class="conc" id="${uid}-conc" aria-live="polite" aria-atomic="true"></div>
<button type="button" class="reset" id="${uid}-reset">Вернуть исходные значения</button>
</div>`;

  const $ = s => el.querySelector('#' + uid + '-' + s);
  const root = el.querySelector('.w-thresholds');
  const input = $('m');

  /* --- SVG --- */
  const COL = {ota: '#163e37', direct: '#62736d', corporate: '#6b8f1f'};
  const badge = (cx, cy, id, r = 11) => `<g aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${id === 'corporate' ? '#d6ed8c' : id === 'ota' ? `url(#${uid}-hatch)` : `url(#${uid}-dots)`}" stroke="#163e37" stroke-width="2"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#163e37" stroke="#fff" stroke-width="2.5" paint-order="stroke" font-family="system-ui,sans-serif">${META[id].letter}</text></g>`;
  const zoneFill = id => id === 'corporate' ? '#e6f3bd' : id === 'ota' ? `url(#${uid}-hatch)` : `url(#${uid}-dots)`;

  function chart(host, o) {
    // o: {w,h,x0,x1,y0,y1,L,R,T,B, res, xTicks, yTicks, yFmt, zones, mark, vlines, labelRows}
    const {w, h, L, R, T, B} = o, W = w - L - R, H = h - T - B;
    const X = v => L + (v - o.x0) / (o.x1 - o.x0) * W, Y = v => T + (o.y1 - v) / (o.y1 - o.y0) * H;
    const res = o.res;
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${uid}-${o.key}t ${uid}-${o.key}d" font-family="system-ui,sans-serif"><title id="${uid}-${o.key}t">${o.title}</title><desc id="${uid}-${o.key}d">${esc(o.desc)}</desc>`;
    for (const z of res.zones) {
      const a = Math.max(z.from, o.x0), b = Math.min(z.to, o.x1);
      if (b <= a) continue;
      s += `<rect x="${X(a)}" y="${T}" width="${X(b) - X(a)}" height="${H}" fill="${zoneFill(z.id)}"/>`;
    }
    for (const v of o.yTicks) s += `<line x1="${L}" x2="${w - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#163e37' : '#dbe2d9'}" stroke-width="${v === 0 ? 1.2 : 1}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#62736d">${o.yFmt(v)}</text>`;
    s += `<text x="2" y="${T - 20}" font-size="12" fill="#62736d">тыс. ₽</text>`;
    // подписи зон
    for (const z of res.zones) {
      const a = Math.max(z.from, o.x0), b = Math.min(z.to, o.x1);
      if (b <= a) continue;
      s += badge(Math.min(w - R - 12, Math.max(L + 12, (X(a) + X(b)) / 2)), T - 15, z.id);
    }
    // границы зон (сплошные)
    for (const z of res.zones.slice(1)) if (z.from > o.x0 && z.from < o.x1) s += `<line x1="${X(z.from)}" x2="${X(z.from)}" y1="${T}" y2="${T + H}" stroke="#163e37" stroke-width="1.5"/>`;
    // попарный порог К–П (штрих)
    const kp = res.thresholds.KP;
    if (kp > o.x0 && kp < o.x1) s += `<line x1="${X(kp)}" x2="${X(kp)}" y1="${T}" y2="${T + H}" stroke="#163e37" stroke-width="2" stroke-dasharray="5 4"/>`;
    // прямые
    for (const id of ORDER) {
      const r = res.rows.find(x => x.id === id);
      const yy = v => r.before - r.displaced * v;
      s += `<line x1="${X(o.x0)}" y1="${Y(yy(o.x0))}" x2="${X(o.x1)}" y2="${Y(yy(o.x1))}" stroke="${COL[id]}" stroke-width="3" stroke-linecap="round"/>`;
    }
    // метки на прямых
    for (const id of ORDER) {
      const r = res.rows.find(x => x.id === id);
      const px = o.badgeAt(id), py = Y(r.before - r.displaced * px);
      s += badge(X(px), py, id, 10);
    }
    // ползунок
    if (res.m >= o.x0 && res.m <= o.x1) {
      const xm = X(res.m);
      s += `<line x1="${xm}" x2="${xm}" y1="${T}" y2="${T + H}" stroke="#b44c26" stroke-width="2.5"/>`;
      for (const id of ORDER) {
        const r = res.rows.find(x => x.id === id);
        s += `<circle cx="${xm}" cy="${Y(r.net)}" r="4.5" fill="#fff" stroke="${COL[id]}" stroke-width="2.5"/>`;
      }
      const lab = 'm = ' + num(res.m), tw = 7.2 * lab.length + 12, right = xm + tw + 6 > w - R;
      s += `<g><rect x="${right ? xm - tw - 4 : xm + 4}" y="${T + H - 26}" width="${tw}" height="22" rx="5" fill="#b44c26"/><text x="${(right ? xm - tw - 4 : xm + 4) + tw / 2}" y="${T + H - 11}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${lab}</text></g>`;
    }
    // подписи по оси X
    for (const t of o.xLabels) {
      const xx = X(t.v), anchor = 'middle';
      const yy = T + H + 16 + (t.row || 0) * 16;
      s += `<line x1="${xx}" x2="${xx}" y1="${T + H}" y2="${T + H + 4 + (t.row || 0) * 16}" stroke="#62736d"/><text x="${xx}" y="${yy + 3}" text-anchor="${anchor}" font-size="12" fill="${t.dash ? '#163e37' : '#62736d'}" ${t.dash ? 'font-style="italic"' : ''}>${t.text}</text>`;
    }
    if (o.xTitle) s += `<text x="${L + W / 2}" y="${h - 4}" text-anchor="middle" font-size="12" fill="#62736d">${o.xTitle}</text>`;
    // маркеры быстрых значений
    if (o.marks) for (const v of o.marks) s += `<path d="M${X(v) - 5} ${T + H + 1} l5 -7 l5 7z" transform="translate(0 0)" fill="#163e37"/>`;
    s += '</svg>';
    host.innerHTML = s;
    if (o.drag) {
      const svg = host.querySelector('svg');
      const setFrom = e => {
        const rect = svg.getBoundingClientRect(), px = (e.clientX - rect.left) * (w / rect.width);
        const v = Math.round((o.x0 + (px - L) / W * (o.x1 - o.x0)) / M_STEP) * M_STEP;
        set(Math.min(M_MAX, Math.max(0, v)));
      };
      let down = false;
      svg.addEventListener('pointerdown', e => { down = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} setFrom(e); });
      svg.addEventListener('pointermove', e => { if (down) setFrom(e); });
      const up = () => { down = false; save(); };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    }
  }

  function draw(res) {
    const w = Math.max(280, Math.floor($('main').clientWidth || root.clientWidth - 34 || 320));
    const small = w < 520;
    const t = res.thresholds;
    const kpTxt = num(t.KP, 2);
    chart($('main'), {
      key: 'main', w, h: small ? 290 : 340, x0: 0, x1: M_MAX, y0: -100000, y1: 1050000, L: 40, R: 22, T: 36, B: 52, res, xTitle: 'm — маржа вытесненной пиковой ночи, ₽',
      title: 'Три прямые: результат пакетов в зависимости от m',
      desc: `Результат пакетов А, П и К при m от 0 до ${num(M_MAX)} ₽. К лучше до ${num(t.KA, 2)}, А до ${num(t.AP)}, П выше. Сейчас m = ${num(res.m)} ₽: ${res.rows.map(r => r.letter + ' ' + money(r.net)).join('; ')}.`,
      yTicks: [0, 250000, 500000, 750000, 1000000], yFmt: v => num(v / 1000),
      xLabels: (small ? [0, 2000, 4000, 6000] : [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]).map(v => ({v, text: num(v)})),
      marks: [1000, 1800, 3000], badgeAt: id => id === 'corporate' ? 5750 : id === 'ota' ? 6300 : 6700,
      drag: true
    });
    const z0 = 1650, z1 = 1950;
    const ys = [];
    for (const r of res.rows) for (const v of [z0, z1]) ys.push(r.before - r.displaced * v);
    const lo = Math.floor((Math.min(...ys) - 3000) / 10000) * 10000, hi = Math.ceil((Math.max(...ys) + 3000) / 10000) * 10000;
    const yt = []; for (let v = lo; v <= hi; v += 10000) yt.push(v);
    chart($('zoom'), {
      key: 'zoom', w, h: small ? 260 : 300, x0: z0, x1: z1, y0: lo, y1: hi, L: 40, R: 22, T: 36, B: 64, res, xTitle: 'm, ₽',
      title: 'Увеличенный фрагмент: зона А между порогами',
      desc: `Увеличение области от ${num(z0)} до ${num(z1)} ₽. К лучше до ${num(t.KA, 2)}, А между ${num(t.KA, 2)} и ${num(t.AP)}, П выше. Пунктир при ${kpTxt}: К и П равны, но лучший здесь А.`,
      yTicks: yt, yFmt: v => num(v / 1000),
      xLabels: [{v: z0, text: num(z0)}, {v: t.KA, text: num(t.KA, 2)}, {v: t.KP, text: kpTxt, row: 1, dash: true}, {v: t.AP, text: num(t.AP)}, {v: z1, text: num(z1)}],
      badgeAt: id => id === 'corporate' ? 1665 : id === 'ota' ? 1935 : 1690,
      drag: false
    });
  }

  function update(fromInit) {
    const res = compute({m});
    const win = res.rows.find(r => r.id === res.best);
    $('mv').textContent = money(m);
    input.value = m;
    input.setAttribute('aria-valuetext', money(m));
    $('head').innerHTML = res.tied.length > 1
      ? `При m = ${money(m)} два пакета равны: граница лучшего решения`
      : `При m = ${money(m)} лучший — ${win.letter} (${win.name.toLowerCase()}): ${money(win.net)}`;
    $('rows').innerHTML = res.rows.map(r => {
      const isBest = res.tied.includes(r.id);
      return `<tr class="${isBest ? 'best' : ''}"><th scope="row"><div class="pk"><i class="b b-${KEY[r.id]}" aria-hidden="true">${r.letter}</i><span class="nm"><span>${r.name}${isBest ? '<span class="tag">лучший</span>' : ''}</span><small>вытесняет ${r.displaced} пиковых ночей</small></span></div></th><td class="n ${r.net < 0 ? 'neg' : ''}">${money(r.net)}</td></tr>`;
    }).join('');
    root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.m) === m)));
    $('conc').innerHTML = '<strong>Вывод:</strong> ' + verdictText(res);
    draw(res);
  }

  function set(v) { m = v; state[ID] = {m}; update(); }

  input.addEventListener('input', () => { set(Number(input.value)); });
  input.addEventListener('change', () => { state[ID] = {m}; save(); });
  root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { set(Number(b.dataset.m)); state[ID] = {m}; save(); }));
  $('reset').addEventListener('click', () => { set(M_DEFAULT); state[ID] = {m}; save(); });
  update();
  if (typeof ResizeObserver !== 'undefined') {
    let lastW = 0;
    new ResizeObserver(() => { const w = $('main').clientWidth; if (w && Math.abs(w - lastW) > 1) { lastW = w; draw(compute({m})); } }).observe(root);
  }
  return {update};
}
