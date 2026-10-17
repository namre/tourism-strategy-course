// Виджет «Своя мощность» (КТ-4): перенос логики вытеснения на неотельный объект.
// compute() — чистая функция расчёта дня; mount() — виджет с пресетами и числовыми полями.

export const ID = 'own-capacity';
const NB = ' ';

export const PRESETS = {
  trail: {id: 'trail', name: 'Экотропа', unit: ['вход', 'входа', 'входов'], unitLabel: 'входов в день', capacity: 100, demand: 140, price: 4000, groupPrice: 2800, cost: 600, groupMax: 50, group: 30},
  bus: {id: 'bus', name: 'Экскурсия на автобусе', unit: ['место', 'места', 'мест'], unitLabel: 'мест', capacity: 45, demand: 50, price: 3500, groupPrice: 2500, cost: 500, groupMax: 45, group: 15},
  custom: {id: 'custom', name: 'Своё', unit: ['место', 'места', 'мест'], unitLabel: 'мест', capacity: '', demand: '', price: '', groupPrice: '', cost: '', groupMax: null, group: 0}
};
export const DEFAULTS = {preset: 'trail', groups: {trail: 30, bus: 15, custom: 0}, custom: {capacity: '', demand: '', price: '', groupPrice: '', cost: ''}};

const int = n => {
  const r = Math.round(n);
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
};
const rub = n => int(n) + NB + '₽';
const pl = (n, f) => {
  const m = Math.abs(n) % 100, d = m % 10;
  return m > 10 && m < 20 ? f[2] : d === 1 ? f[0] : d > 1 && d < 5 ? f[1] : f[2];
};
const num = v => (v === '' || v === null || v === undefined ? NaN : Number(v));

/**
 * params: {capacity, demand, price, groupPrice, cost, group}
 * продано индивидуальных = min(спрос, мощность − группа);
 * результат = инд·(цена − затраты) + группа·(цена группы − затраты);
 * сравнение — с вариантом без группы: min(спрос, мощность)·(цена − затраты).
 */
export function compute(params = {}) {
  const capacity = num(params.capacity), demand = num(params.demand), price = num(params.price);
  const groupPrice = num(params.groupPrice), cost = num(params.cost);
  const groupRaw = params.group === '' || params.group == null ? 0 : Number(params.group);
  const valid = [capacity, demand, price, groupPrice, cost, groupRaw].every(Number.isFinite) &&
    capacity > 0 && demand >= 0 && price >= 0 && groupPrice >= 0 && cost >= 0 && groupRaw >= 0;
  if (!valid) return {valid: false};
  const group = Math.min(Math.round(groupRaw), Math.floor(capacity));
  const baseSold = Math.min(demand, capacity);
  const sold = Math.min(demand, capacity - group);
  const baseline = baseSold * (price - cost);
  const result = sold * (price - cost) + group * (groupPrice - cost);
  return {
    valid: true, capacity, demand, price, groupPrice, cost, group,
    baseSold, sold,
    displaced: baseSold - sold,           // вытесненные индивидуальные гости
    empty: capacity - sold - group,       // свободные места при группе
    baseEmpty: capacity - baseSold,
    baseline, result,
    delta: result - baseline
  };
}

const CSS = `
.w-own-capacity,.w-own-capacity *{box-sizing:border-box}
.w-own-capacity{--ink:#163e37;--muted:#62736d;--line:#dbe2d9;--lime:#d6ed8c;--orange:#b44c26;--paper:#f4f3ed;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;max-width:720px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;min-width:0}
.w-own-capacity h3{font:600 18px/1.25 Georgia,serif;letter-spacing:0;margin:0 0 12px}
.w-own-capacity .oc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}
.w-own-capacity .oc-stat{background:var(--paper);border-radius:9px;padding:8px 10px;min-width:0}
.w-own-capacity .oc-stat span{display:block;font-size:12px;line-height:1.3;color:var(--muted)}
.w-own-capacity .oc-stat strong{display:block;font:600 20px/1.2 Georgia,serif;white-space:nowrap}
.w-own-capacity .oc-stat.bad strong{color:var(--orange)}
.w-own-capacity .oc-empty{margin:0 0 14px;padding:14px;border:1px dashed #aab9ae;border-radius:9px;color:var(--muted);background:var(--paper)}
.w-own-capacity .oc-row{font-size:13px;color:var(--muted);margin:10px 0 5px}
.w-own-capacity .oc-row b{color:var(--ink)}
.w-own-capacity .oc-bar{position:relative;display:flex;height:36px;border:1px solid var(--ink);border-radius:6px;overflow:hidden;background:#fff}
.w-own-capacity .oc-bar i{display:block;height:100%;min-width:0}
.w-own-capacity .oc-ind{background:var(--ink)}
.w-own-capacity .oc-free{background:#fff;border:2px dashed #62736d}
.w-own-capacity .oc-gfree{background-color:var(--lime);background-image:repeating-linear-gradient(45deg,#163e37 0 2px,transparent 2px 8px)}
.w-own-capacity .oc-gdis{background-color:var(--orange);background-image:repeating-linear-gradient(45deg,#fff 0 2px,transparent 2px 8px)}
.w-own-capacity .oc-legend{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;font-size:13px}
.w-own-capacity .oc-legend li{display:flex;gap:8px;align-items:center}
.w-own-capacity .oc-sw{flex:none;width:22px;height:14px;border:1px solid var(--ink);border-radius:3px}
.w-own-capacity .oc-sw.ind{background:var(--ink)}
.w-own-capacity .oc-sw.free{background:#fff;border:2px dashed #62736d}
.w-own-capacity .oc-sw.gfree{background-color:var(--lime);background-image:repeating-linear-gradient(45deg,#163e37 0 2px,transparent 2px 6px)}
.w-own-capacity .oc-sw.gdis{background-color:var(--orange);border-color:var(--orange);background-image:repeating-linear-gradient(45deg,#fff 0 2px,transparent 2px 6px)}
.w-own-capacity .oc-calc{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0 0;background:#fff}
.w-own-capacity .oc-calc th,.w-own-capacity .oc-calc td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;background:transparent;font-weight:400;vertical-align:top}
.w-own-capacity .oc-calc td:last-child{text-align:right;white-space:nowrap;font-family:Georgia,serif}
.w-own-capacity .oc-calc th small,.w-own-capacity .oc-calc td small{display:block;font:12px system-ui,sans-serif;color:var(--muted);white-space:normal}
.w-own-capacity fieldset{border:0;margin:16px 0 0;padding:0;min-width:0}
.w-own-capacity legend{font-size:13px;font-weight:650;padding:0;margin-bottom:6px}
.w-own-capacity .oc-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.w-own-capacity .oc-presets label{position:relative;display:flex;align-items:center;justify-content:center;min-height:56px;padding:6px;border:1px solid var(--line);border-radius:10px;cursor:pointer;text-align:center;font-size:13px;line-height:1.2;background:#fff;margin:0}
.w-own-capacity .oc-presets input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer;width:100%;height:100%}
.w-own-capacity .oc-presets label:has(input:checked){background:var(--lime);border:2px solid var(--ink);font-weight:650}
.w-own-capacity .oc-presets label:has(input:focus-visible){outline:3px solid var(--orange);outline-offset:2px}
.w-own-capacity .oc-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;margin-top:14px}
.w-own-capacity .oc-fields label{display:block;font-size:13px;font-weight:600;line-height:1.3;margin:0}
.w-own-capacity .oc-fields input{display:block;width:100%;min-height:44px;margin-top:4px;padding:6px 10px;border:1px solid #8fa398;border-radius:8px;background:#fff;color:var(--ink);font:16px system-ui,sans-serif}
.w-own-capacity .oc-fields input[readonly]{background:var(--paper);border-color:var(--line);color:#3f5650}
.w-own-capacity .oc-fields input:focus-visible,.w-own-capacity button:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.w-own-capacity .oc-range{margin-top:14px}
.w-own-capacity .oc-range label{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:650;margin:0 0 2px}
.w-own-capacity .oc-range output{font-family:Georgia,serif;white-space:nowrap}
.w-own-capacity input[type=range]{display:block;width:100%;height:44px;margin:0;accent-color:var(--ink);background:transparent}
.w-own-capacity .oc-hint{font-size:13px;color:var(--muted);margin:10px 0 0;max-width:none}
.w-own-capacity .oc-verdict{margin:14px 0 0;padding:12px 14px;border-left:3px solid var(--ink);background:#eaf0df;border-radius:0 9px 9px 0;max-width:none}
.w-own-capacity .oc-verdict.bad{border-left-color:var(--orange);background:#fbeee8}
.w-own-capacity .oc-reset{margin-top:12px;min-height:44px;padding:0 18px;border:1px solid #aab9ae;border-radius:9px;background:transparent;color:var(--ink);font:650 15px system-ui,sans-serif;cursor:pointer}
@media(max-width:420px){.w-own-capacity{padding:14px}.w-own-capacity .oc-stat strong{font-size:16px}}
`;

function resultHTML(c, preset) {
  if (!c.valid) {
    return `<p class="oc-empty" aria-live="polite">Введите мощность, спрос, цены и затраты — расчёт появится здесь.</p>`;
  }
  const u = preset.unit;
  const pc = n => (n / c.capacity * 100).toFixed(3) + '%';
  const gDis = Math.min(c.group, c.displaced), gFree = c.group - gDis;
  const bad = c.delta < 0;
  const sign = c.delta > 0 ? '+' : '';
  return `<div class="oc-stats" aria-live="polite">
  <div class="oc-stat ${c.displaced ? 'bad' : ''}"><span>Вытеснено гостей</span><strong>${int(c.displaced)}</strong></div>
  <div class="oc-stat"><span>Результат с группой</span><strong>${rub(c.result)}</strong></div>
  <div class="oc-stat ${bad ? 'bad' : ''}"><span>Против варианта без группы</span><strong>${sign}${rub(c.delta)}</strong></div>
</div>
<div class="oc-row"><b>Без группы</b> — ${int(c.baseSold)} из ${int(c.capacity)}</div>
<div class="oc-bar" role="img" aria-label="Без группы: индивидуальных ${int(c.baseSold)}, свободно ${int(c.baseEmpty)}">
  <i class="oc-ind" style="width:${pc(c.baseSold)}"></i>${c.baseEmpty > 0 ? `<i class="oc-free" style="width:${pc(c.baseEmpty)}"></i>` : ''}
</div>
<div class="oc-row"><b>С группой ${int(c.group)} ${pl(c.group, u)}</b> — индивидуальных ${int(c.sold)}</div>
<div class="oc-bar" role="img" aria-label="С группой: индивидуальных ${int(c.sold)}, свободно ${int(c.empty)}, группа на свободных местах ${int(gFree)}, группа на местах вытесненных гостей ${int(gDis)}">
  ${c.sold > 0 ? `<i class="oc-ind" style="width:${pc(c.sold)}"></i>` : ''}${c.empty > 0 ? `<i class="oc-free" style="width:${pc(c.empty)}"></i>` : ''}${gDis > 0 ? `<i class="oc-gdis" style="width:${pc(gDis)}"></i>` : ''}${gFree > 0 ? `<i class="oc-gfree" style="width:${pc(gFree)}"></i>` : ''}
</div>
<ul class="oc-legend">
  <li><i class="oc-sw ind"></i>Индивидуальные гости</li>
  <li><i class="oc-sw free"></i>Свободные места (штрих)</li>
  <li><i class="oc-sw gfree"></i>Группа на свободных местах</li>
  <li><i class="oc-sw gdis"></i>Группа на местах вытесненных гостей</li>
</ul>
<table class="oc-calc"><tbody>
  <tr><th scope="row">Без группы<small>${int(c.baseSold)} × (${int(c.price)} − ${int(c.cost)})</small></th><td>${rub(c.baseline)}</td></tr>
  <tr><th scope="row">С группой<small>${int(c.sold)} × ${int(c.price - c.cost)} + ${int(c.group)} × ${int(c.groupPrice - c.cost)}</small></th><td>${rub(c.result)}</td></tr>
  <tr><th scope="row">Разница</th><td style="color:${bad ? '#b44c26' : 'inherit'}">${sign}${rub(c.delta)}</td></tr>
</tbody></table>`;
}

function verdictText(c, preset) {
  if (!c.valid) return '<b>Вывод:</b> заполните все поля числами — вывод появится после расчёта.';
  const u = preset.unit;
  if (c.group === 0) return '<b>Вывод:</b> группа не продаётся — результат совпадает с вариантом без группы. Сдвиньте ползунок «Группа».';
  const g = `${int(c.group)}${NB}${pl(c.group, u)}`;
  if (c.displaced > 0) {
    const how = c.delta < 0
      ? `день приносит на ${rub(-c.delta)} меньше (${rub(c.result)} против ${rub(c.baseline)})`
      : c.delta > 0 ? `но день приносит на ${rub(c.delta)} больше (${rub(c.result)} против ${rub(c.baseline)})` : `результат тот же (${rub(c.result)})`;
    return `<b>Вывод:</b> группа из ${g} вытесняет ${int(c.displaced)} ${pl(c.displaced, ['индивидуального гостя', 'индивидуальных гостя', 'индивидуальных гостей'])}, ${how}.`;
  }
  return `<b>Вывод:</b> группа из ${g} помещается в свободные места и никого не вытесняет — день приносит на ${rub(c.delta)} больше (${rub(c.result)} против ${rub(c.baseline)}).`;
}

export function mount(el, {state = {}, save = () => {}} = {}) {
  const st = state[ID] = Object.assign({}, DEFAULTS, state[ID]);
  st.groups = Object.assign({}, DEFAULTS.groups, st.groups);
  st.custom = Object.assign({}, DEFAULTS.custom, st.custom);
  if (!PRESETS[st.preset]) st.preset = DEFAULTS.preset;
  const uid = ID + '-' + Math.random().toString(36).slice(2, 7);
  const FIELDS = [['capacity', 'Мощность в пиковый день'], ['demand', 'Спрос индивидуальных'], ['price', 'Цена индивидуального, ₽'], ['groupPrice', 'Цена группового места, ₽'], ['cost', 'Затраты на гостя, ₽']];
  el.innerHTML = `<style>${CSS}</style><div class="w-own-capacity">
  <h3>Своя мощность</h3>
  <div data-result></div>
  <fieldset><legend>Объект</legend><div class="oc-presets" role="radiogroup">
    ${Object.values(PRESETS).map(p => `<label><input type="radio" name="${uid}" value="${p.id}"><span>${p.name}</span></label>`).join('')}
  </div></fieldset>
  <div class="oc-fields">
    ${FIELDS.map(([k, l]) => `<label for="${uid}-${k}"><span data-lbl="${k}">${l}</span><input id="${uid}-${k}" data-f="${k}" type="number" inputmode="decimal" min="0" step="any"></label>`).join('')}
  </div>
  <div class="oc-range"><label for="${uid}-g"><span>Группа</span><output for="${uid}-g" data-gv></output></label>
    <input id="${uid}-g" type="range" min="0" max="50" step="1"></div>
  <p class="oc-hint" data-hint></p>
  <p class="oc-verdict" data-verdict aria-live="polite"></p>
  <button type="button" class="oc-reset">Вернуть исходные значения</button>
</div>`;
  const q = s => el.querySelector(s);
  const inputs = Object.fromEntries([...el.querySelectorAll('[data-f]')].map(i => [i.dataset.f, i]));
  const range = q('input[type=range]');
  const radios = [...el.querySelectorAll('input[type=radio]')];

  const params = () => {
    const p = PRESETS[st.preset];
    const base = st.preset === 'custom' ? st.custom : p;
    return {capacity: base.capacity, demand: base.demand, price: base.price, groupPrice: base.groupPrice, cost: base.cost, group: st.groups[st.preset]};
  };
  function groupMax(p) {
    if (p.groupMax) return p.groupMax;
    const cap = num(st.custom.capacity);
    return Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : 0;
  }
  function update(fromFields) {
    const p = PRESETS[st.preset];
    const prm = params();
    const gm = groupMax(p);
    st.groups[st.preset] = Math.max(0, Math.min(gm, Math.round(Number(st.groups[st.preset]) || 0)));
    prm.group = st.groups[st.preset];
    const c = compute(prm);
    q('[data-result]').innerHTML = resultHTML(c, p);
    q('[data-verdict]').innerHTML = verdictText(c, p);
    q('[data-verdict]').classList.toggle('bad', !!c.valid && c.delta < 0);
    const custom = st.preset === 'custom';
    for (const [k, inp] of Object.entries(inputs)) {
      inp.readOnly = !custom;
      inp.setAttribute('aria-readonly', String(!custom));
      if (!fromFields) inp.value = custom ? st.custom[k] : p[k];
    }
    q('[data-lbl=capacity]').textContent = 'Мощность в пиковый день, ' + p.unitLabel;
    q('[data-lbl=demand]').textContent = 'Спрос индивидуальных, ' + (p.unitLabel === 'входов в день' ? 'входов' : 'мест');
    range.max = gm; range.disabled = gm === 0;
    range.value = st.groups[st.preset];
    q('[data-gv]').textContent = int(st.groups[st.preset]) + NB + pl(st.groups[st.preset], p.unit);
    range.setAttribute('aria-valuetext', q('[data-gv]').textContent);
    radios.forEach(r => { r.checked = r.value === st.preset; });
    q('[data-hint]').textContent = custom
      ? 'Замените числа своими: введите данные вашего объекта. Допустим, что все места группы продаются.'
      : 'Числа примера — допущения. Чтобы разобрать свой объект, выберите «Своё» и замените числа своими. Допустим, что все места группы продаются.';
  }
  radios.forEach(r => r.addEventListener('change', () => { if (r.checked) { st.preset = r.value; save(); update(false); } }));
  for (const [k, inp] of Object.entries(inputs)) {
    inp.addEventListener('input', () => { if (st.preset === 'custom') { st.custom[k] = inp.value; save(); update(true); } });
  }
  range.addEventListener('input', () => { st.groups[st.preset] = Number(range.value); save(); update(true); });
  q('.oc-reset').addEventListener('click', () => {
    st.preset = DEFAULTS.preset; st.groups = {...DEFAULTS.groups}; st.custom = {...DEFAULTS.custom};
    save(); update(false);
  });
  update(false);
}
