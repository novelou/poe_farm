const API_ROOT = 'https://poe.ninja/poe2/api/economy';
const CACHE_TTL = 60 * 60 * 1000;
const EXCHANGE_CATEGORIES = ['Fragments', 'Abyss', 'LineageSupportGems', 'Expedition', 'Delirium', 'Breach', 'Ritual', 'Verisium'];
const STASH_CATEGORIES = ['UniqueWeapons', 'UniqueArmours', 'UniqueAccessories', 'UniqueFlasks', 'UniqueJewels', 'UniqueSanctumRelics'];
const REQUEST_HEADERS = { Accept: 'application/json', 'User-Agent': 'PoE2BossMarket/0.1 (boss access and drop viewer)' };
let memorySnapshot;
let refreshPromise;

const normalizeName = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
const numberArray = value => (Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [])
  .map(point => typeof point === 'number' ? point : point?.value ?? point?.price)
  .filter(Number.isFinite);

function metadataMap(...sources) {
  return new Map(sources.flatMap(raw => Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : [])
    .map(item => [String(item.id), item]));
}

function primaryCurrency(core, metadata) {
  if (typeof core?.primary === 'object') return core.primary.name || core.primary.id || '';
  return metadata.get(String(core?.primary))?.name || core?.primary || 'Exalted Orb';
}

function normalizeExchange(data, category) {
  const metadata = metadataMap(data?.core?.items, data?.items);
  const currency = primaryCurrency(data?.core, metadataMap(data?.core?.items));
  return (Array.isArray(data?.lines) ? data.lines : []).flatMap(line => {
    const item = metadata.get(String(line.id)) || line.item || {};
    const itemName = item.name || line.name;
    const value = Number(line.primaryValue);
    if (!itemName || !Number.isFinite(value)) return [];
    return [{ id: String(line.id ?? item.id ?? itemName), itemName, icon: item.icon || item.image || line.icon, value, currency,
      listingCount: Number(line.listingCount ?? line.volumePrimaryValue ?? 0) || undefined,
      sparkline: numberArray(line.sparkline), trend: Number.isFinite(Number(line.sparkline?.totalChange)) ? Number(line.sparkline.totalChange) : undefined,
      sourceCategory: category }];
  });
}

function normalizeStash(data, category) {
  const metadata = metadataMap(data?.core?.items, data?.items);
  const fallbackCurrency = primaryCurrency(data?.core, metadataMap(data?.core?.items));
  return (Array.isArray(data?.lines) ? data.lines : []).flatMap(line => {
    const item = line.item || metadata.get(String(line.id)) || {};
    const itemName = line.name || item.name || line.baseType;
    const value = Number(line.primaryValue ?? line.value ?? line.chaosValue);
    const currency = line.primaryCurrency?.name || line.primaryCurrency || line.currency?.name || line.currency || fallbackCurrency;
    if (!itemName || !Number.isFinite(value)) return [];
    const sparkline = line.sparkline || line.sparkLine;
    return [{ id: String(line.itemId ?? line.id ?? item.id ?? `${category}:${itemName}`), itemName, icon: line.icon || item.icon || item.image, value, currency,
      listingCount: Number(line.listingCount ?? line.count ?? 0) || undefined, sparkline: numberArray(sparkline),
      trend: Number.isFinite(Number(sparkline?.totalChange)) ? Number(sparkline.totalChange) : undefined, sourceCategory: category }];
  });
}

function deduplicatePrices(items) {
  const groups = new Map();
  for (const item of items) groups.set(normalizeName(item.itemName), [...(groups.get(normalizeName(item.itemName)) || []), item]);
  return [...groups.values()].map(group => {
    if (group.length === 1) return group[0];
    if (new Set(group.map(item => `${item.id}|${item.sourceCategory}`)).size > 1) return { ...group[0], ambiguous: true };
    return group.sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0))[0];
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function refreshMarket(env) {
  const leagues = await fetchJson(`${API_ROOT}/leagues`);
  const league = env?.POE_NINJA_LEAGUE?.trim() || leagues?.[0]?.id || leagues?.[0]?.name || 'Runes of Aldur';
  const encodedLeague = encodeURIComponent(league);
  const tasks = [
    ...EXCHANGE_CATEGORIES.map(category => async () => ({ kind: 'exchange', category, data: await fetchJson(`${API_ROOT}/exchange/current/overview?league=${encodedLeague}&type=${category}`) })),
    ...STASH_CATEGORIES.map(category => async () => ({ kind: 'stash', category, data: await fetchJson(`${API_ROOT}/stash/current/item/overview?league=${encodedLeague}&type=${category}`) })),
  ];
  const results = [];
  for (let index = 0; index < tasks.length; index += 5) results.push(...await Promise.allSettled(tasks.slice(index, index + 5).map(task => task())));
  const prices = [];
  const failedCategories = [];
  for (const result of results) {
    if (result.status === 'rejected') { failedCategories.push(result.reason?.message || 'unknown'); continue; }
    const { kind, category, data } = result.value;
    prices.push(...(kind === 'exchange' ? normalizeExchange(data, category) : normalizeStash(data, category)));
  }
  if (!prices.length) throw new Error('All market categories failed');
  return { source: 'live', league, fetchedAt: new Date().toISOString(), items: deduplicatePrices(prices), failedCategories };
}

async function getMarket(env) {
  const fresh = snapshot => snapshot && Date.now() - new Date(snapshot.fetchedAt).getTime() < CACHE_TTL;
  if (fresh(memorySnapshot)) return memorySnapshot;
  const cache = caches.default;
  const cacheKey = new Request('https://poe2-boss-market.internal/market');
  const cachedResponse = await cache.match(cacheKey);
  const cached = cachedResponse ? await cachedResponse.json() : undefined;
  if (fresh(cached)) { memorySnapshot = cached; return cached; }
  if (!refreshPromise) refreshPromise = refreshMarket(env).finally(() => { refreshPromise = undefined; });
  try {
    memorySnapshot = await refreshPromise;
    await cache.put(cacheKey, new Response(JSON.stringify(memorySnapshot), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } }));
    return memorySnapshot;
  } catch (error) {
    if (cached) return { ...cached, source: 'stale', error: error.message };
    return { source: 'unavailable', league: env?.POE_NINJA_LEAGUE || 'Runes of Aldur', fetchedAt: null, items: [], failedCategories: [], error: error.message };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/market') {
      const market = await getMarket(env);
      return Response.json(market, { status: market.source === 'unavailable' ? 503 : 200,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
    }
    const response = await env.ASSETS.fetch(request);
    if ((response.headers.get('content-type') || '').includes('text/html')) {
      const headers = new Headers(response.headers);
      return new Response((await response.text()).replaceAll('__PUBLIC_ORIGIN__', url.origin), { status: response.status, headers });
    }
    return response;
  },
};
