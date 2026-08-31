import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_ROOT = 'https://poe.ninja/poe2/api/economy';
const CACHE_TTL = 60 * 60 * 1000;
const cacheFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'market-snapshot.json');
const exchangeCategories = ['Fragments', 'Abyss', 'LineageSupportGems', 'Expedition', 'Delirium', 'Breach', 'Ritual', 'Verisium'];
const stashCategories = ['UniqueWeapons', 'UniqueArmours', 'UniqueAccessories', 'UniqueFlasks', 'UniqueJewels', 'UniqueSanctumRelics'];
const responseCache = new Map();
let memorySnapshot = null;
let refreshPromise = null;

const requestHeaders = { Accept: 'application/json', 'User-Agent': 'PoE2BossMarket/0.1 (boss access and drop viewer)' };

export function normalizeName(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
}

function numberArray(value) {
  const source = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
  return source.map(point => typeof point === 'number' ? point : point?.value ?? point?.price).filter(Number.isFinite);
}

function metadataMap(...sources) {
  const entries = sources.flatMap(raw => Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : []);
  return new Map(entries.map(item => [String(item.id), item]));
}

function primaryCurrency(core, metadata) {
  if (typeof core?.primary === 'object') return core.primary.name || core.primary.id || '';
  return metadata.get(String(core?.primary))?.name || core?.primary || 'Exalted Orb';
}

export function normalizeExchange(data, category) {
  const metadata = metadataMap(data?.core?.items, data?.items);
  const currency = primaryCurrency(data?.core, metadataMap(data?.core?.items));
  return (Array.isArray(data?.lines) ? data.lines : []).flatMap(line => {
    const item = metadata.get(String(line.id)) || line.item || {};
    const itemName = item.name || line.name;
    const value = Number(line.primaryValue);
    if (!itemName || !Number.isFinite(value)) return [];
    return [{ id: String(line.id ?? item.id ?? itemName), itemName, icon: item.icon || item.image || line.icon, value, currency, listingCount: Number(line.listingCount ?? line.volumePrimaryValue ?? 0) || undefined, sparkline: numberArray(line.sparkline), trend: Number.isFinite(Number(line.sparkline?.totalChange)) ? Number(line.sparkline.totalChange) : undefined, sourceCategory: category }];
  });
}

export function normalizeStash(data, category) {
  const metadata = metadataMap(data?.core?.items, data?.items);
  const fallbackCurrency = primaryCurrency(data?.core, metadataMap(data?.core?.items));
  return (Array.isArray(data?.lines) ? data.lines : []).flatMap(line => {
    const item = line.item || metadata.get(String(line.id)) || {};
    const itemName = line.name || item.name || line.baseType;
    const value = Number(line.primaryValue ?? line.value ?? line.chaosValue);
    const currency = line.primaryCurrency?.name || line.primaryCurrency || line.currency?.name || line.currency || fallbackCurrency;
    if (!itemName || !Number.isFinite(value)) return [];
    const sparkline = line.sparkline || line.sparkLine;
    return [{ id: String(line.itemId ?? line.id ?? item.id ?? `${category}:${itemName}`), itemName, icon: line.icon || item.icon || item.image, value, currency, listingCount: Number(line.listingCount ?? line.count ?? 0) || undefined, sparkline: numberArray(sparkline), trend: Number.isFinite(Number(sparkline?.totalChange)) ? Number(sparkline.totalChange) : undefined, sourceCategory: category }];
  });
}

export function deduplicatePrices(items) {
  const groups = new Map();
  for (const item of items) {
    const key = normalizeName(item.itemName);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    if (group.length === 1) return group[0];
    const signatures = new Set(group.map(item => `${item.id}|${item.sourceCategory}`));
    if (signatures.size > 1) return { ...group[0], ambiguous: true };
    return group.sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0))[0];
  });
}

async function fetchJson(url) {
  const cached = responseCache.get(url);
  const headers = { ...requestHeaders };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const response = await fetch(url, { headers });
  if (response.status === 304 && cached) return cached.data;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.json();
  responseCache.set(url, { etag: response.headers.get('etag'), data });
  return data;
}

async function inBatches(tasks, size = 5) {
  const output = [];
  for (let index = 0; index < tasks.length; index += size) {
    const results = await Promise.allSettled(tasks.slice(index, index + size).map(task => task()));
    output.push(...results);
  }
  return output;
}

async function readSnapshot() {
  if (memorySnapshot) return memorySnapshot;
  try { memorySnapshot = JSON.parse(await readFile(cacheFile, 'utf8')); } catch { memorySnapshot = null; }
  return memorySnapshot;
}

async function saveSnapshot(snapshot) {
  memorySnapshot = snapshot;
  try { await mkdir(dirname(cacheFile), { recursive: true }); await writeFile(cacheFile, JSON.stringify(snapshot), 'utf8'); } catch { /* memory cache remains available */ }
}

async function refreshMarket() {
  const leagues = await fetchJson(`${API_ROOT}/leagues`);
  const override = process.env.POE_NINJA_LEAGUE?.trim();
  const league = override || leagues?.[0]?.id || leagues?.[0]?.name || 'Runes of Aldur';
  const encodedLeague = encodeURIComponent(league);
  const tasks = [
    ...exchangeCategories.map(category => async () => ({ kind: 'exchange', category, data: await fetchJson(`${API_ROOT}/exchange/current/overview?league=${encodedLeague}&type=${category}`) })),
    ...stashCategories.map(category => async () => ({ kind: 'stash', category, data: await fetchJson(`${API_ROOT}/stash/current/item/overview?league=${encodedLeague}&type=${category}`) })),
  ];
  const results = await inBatches(tasks);
  const prices = [];
  const failedCategories = [];
  for (const result of results) {
    if (result.status === 'rejected') { failedCategories.push(result.reason?.message || 'unknown'); continue; }
    const { kind, category, data } = result.value;
    prices.push(...(kind === 'exchange' ? normalizeExchange(data, category) : normalizeStash(data, category)));
  }
  if (!prices.length) throw new Error('All market categories failed');
  const snapshot = { source: 'live', league, fetchedAt: new Date().toISOString(), items: deduplicatePrices(prices), failedCategories };
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function getMarket() {
  const snapshot = await readSnapshot();
  if (snapshot && Date.now() - new Date(snapshot.fetchedAt).getTime() < CACHE_TTL) return { ...snapshot, source: snapshot.source === 'unavailable' ? 'unavailable' : 'live' };
  if (!refreshPromise) refreshPromise = refreshMarket().finally(() => { refreshPromise = null; });
  try { return await refreshPromise; }
  catch (error) {
    if (snapshot) return { ...snapshot, source: 'stale', error: error.message };
    return { source: 'unavailable', league: process.env.POE_NINJA_LEAGUE || 'Runes of Aldur', fetchedAt: null, items: [], failedCategories: [], error: error.message };
  }
}
