#!/usr/bin/env node
// Проверка ссылок карточек кейсов: открываются ли из России и есть ли копия в Wayback Machine.
// Запуск: node tools/check-case-links.mjs  → data/cases-linkcheck.json
// Из России проверяем через три российских узла check-host.net (Москва ×2, Санкт-Петербург).
// Узлы стоят в дата-центрах, фильтрация на них неодинакова, поэтому ссылка считается доступной,
// только если она открылась на всех трёх узлах; контрольная пара (открытый и заблокированный сайт)
// показывает, что узлы в момент проверки фильтруют трафик.
import fs from 'node:fs';
import {caseStudies} from '../cases-data.js';

const NODES = ['ru1.node.check-host.net', 'ru2.node.check-host.net', 'ru3.node.check-host.net'];
const CONTROLS = {open: 'https://ya.ru/', blocked: 'https://www.bbc.com/news'};
const out = new URL('../data/cases-linkcheck.json', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {urls: {}};
const only = process.argv.includes('--missing'); // перепроверять только то, что ещё не прошло

async function json(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(40000)});
      if (r.status === 429 || r.status >= 500) { await sleep(4000 * (i + 1)); continue; }
      return await r.json();
    } catch { await sleep(3000 * (i + 1)); }
  }
  return null;
}

async function fromRussia(url) {
  const start = await json(`https://check-host.net/check-http?host=${encodeURIComponent(url)}&${NODES.map(n => 'node=' + n).join('&')}`);
  if (!start?.request_id) return {error: 'check-host не принял запрос'};
  let res = null;
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    res = await json(`https://check-host.net/check-result/${start.request_id}`);
    if (res && NODES.every(n => res[n] !== null && res[n] !== undefined)) break;
  }
  const nodes = {};
  for (const n of NODES) {
    const r = res?.[n]?.[0];
    nodes[n] = r ? {ok: r[0] === 1, code: r[3] ?? null, note: r[2] ?? null} : {ok: false, code: null, note: 'нет ответа узла'};
  }
  return {report: start.permanent_link, nodes, ok: NODES.every(n => nodes[n].ok && /^[23]/.test(String(nodes[n].code)))};
}

async function archive(url) {
  const r = await json(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
  const s = r?.archived_snapshots?.closest;
  if (s?.available && /^2|^3/.test(String(s.status))) return {url: s.url.replace(/^http:/, 'https:'), timestamp: s.timestamp};
  return null;
}

const urls = new Map();
for (const [lesson, list] of Object.entries(caseStudies)) for (const c of list) for (const s of c.sources) urls.set(s.url, `${lesson}/${c.id}`);

const result = {checkedAt: new Date().toISOString(), method: 'check-host.net, узлы ' + NODES.join(', ') + '; Wayback Machine availability API', controls: {}, urls: {}};
for (const [k, u] of Object.entries(CONTROLS)) result.controls[k] = {url: u, ...(await fromRussia(u))};
for (const [url, where] of urls) {
  const old = prev.urls?.[url];
  if (only && old?.ru?.ok && old?.archive) { result.urls[url] = old; continue; }
  const ru = await fromRussia(url);
  const arch = (await archive(url)) || old?.archive || null;
  const archRu = arch ? await fromRussia(arch.url) : null;
  result.urls[url] = {where, ru, archive: arch ? {...arch, ruOk: archRu?.ok ?? false} : null, checkedAt: new Date().toISOString()};
  console.log((ru.ok ? 'RU ok ' : 'RU !! ') + (arch ? 'arch ok ' : 'arch !! ') + url);
  await sleep(1500);
}
fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log('Контроль: открытый', result.controls.open.ok, '· заблокированный', result.controls.blocked.ok);
