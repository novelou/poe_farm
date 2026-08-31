import { encounters, mechanics } from './data/encounters.js';

const state = { query: '', mechanic: 'all', tier: 'all', showUnknown: true, sort: 'drop', market: null };
const aliases = new Map([
  ["kulemak’s invitation", "kulemak's invitation"],
  ["raven’s reflection", "raven's reflection"],
  ["atziri’s step", "atziri's step"],
  ["atziri’s splendour", "atziri's splendour"],
  ["atziri’s acuity", "atziri's acuity"],
]);
const byId = new Map(encounters.map(encounter => [encounter.id, encounter]));

const elements = {
  cards: document.querySelector('#encounters'), count: document.querySelector('#result-count'),
  empty: document.querySelector('#empty-state'), status: document.querySelector('#market-status'),
  search: document.querySelector('#search'), mechanic: document.querySelector('#mechanic'), tier: document.querySelector('#tier'),
  unknown: document.querySelector('#show-unknown'), sort: document.querySelector('#sort'),
  dialog: document.querySelector('#detail-dialog'), detail: document.querySelector('#detail-content'),
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[character]);
const normalize = value => aliases.get(String(value || '').trim().toLowerCase()) || String(value || '').trim().toLowerCase();
const priceIndex = () => new Map((state.market?.items || []).filter(item => !item.ambiguous).map(item => [normalize(item.itemName), item]));
const getPrice = (name, index = priceIndex()) => index.get(normalize(name)) || null;

function formatCurrency(currency = '') {
  const value = typeof currency === 'object' ? currency.name || currency.id : currency;
  if (/divine/i.test(value)) return 'div';
  if (/exalted/i.test(value)) return 'ex';
  if (/chaos/i.test(value)) return 'c';
  return value || '—';
}

function formatPrice(price) {
  if (!price || !Number.isFinite(price.value)) return '—';
  const value = price.value >= 100 ? Math.round(price.value) : price.value >= 10 ? price.value.toFixed(1) : price.value.toFixed(2);
  return `${value.replace(/\.00$/, '').replace(/\.0$/, '')} ${formatCurrency(price.currency)}`;
}

function trendValue(price) {
  if (Number.isFinite(price?.trend)) return price.trend;
  const points = (price?.sparkline || []).filter(Number.isFinite);
  if (!points.length) return null;
  return points.at(-1);
}

function trendMarkup(price) {
  const value = trendValue(price);
  if (value === null || Math.abs(value) < .1) return '<span class="trend flat">—</span>';
  const rising = value > 0;
  return `<span class="trend ${rising ? 'up' : 'down'}">${rising ? '↗' : '↘'} ${Math.abs(value).toFixed(1)}%</span>`;
}

function probabilityMarkup(probability) {
  if (!probability || probability.type === 'unknown') return '<span class="probability unknown">不明</span>';
  if (probability.type === 'guaranteed') return '<span class="probability guaranteed">確定</span>';
  if (probability.type === 'range') return `<span class="probability">${probability.min}–${probability.max}%</span>`;
  const prefix = probability.approximate ? '約' : '';
  return `<span class="probability">${prefix}${probability.value}%</span>`;
}

function requiredAccess(encounter) {
  return (encounter.access.items || []).filter(item => !item.optional && item.priceable !== false);
}

function accessTotal(encounter, index = priceIndex()) {
  const required = requiredAccess(encounter);
  if (!required.length) return null;
  const prices = required.map(item => ({ item, price: getPrice(item.itemName, index) }));
  if (prices.some(entry => !entry.price || !Number.isFinite(entry.price.value))) return null;
  const currencies = new Set(prices.map(entry => formatCurrency(entry.price.currency)));
  if (currencies.size !== 1) return null;
  return { value: prices.reduce((sum, entry) => sum + entry.price.value * entry.item.quantity, 0), currency: prices[0].price.currency };
}

function topDropValue(encounter, index = priceIndex()) {
  return Math.max(-1, ...encounter.drops.map(drop => getPrice(drop.itemName, index)?.value ?? -1));
}

function accessSummary(encounter, index) {
  const items = encounter.access.items || [];
  if (!items.length) return '進行条件';
  if (items.length === 1) return `${items[0].itemName}${items[0].quantity > 1 ? ` ×${items[0].quantity}` : ''}`;
  if (encounter.access.mode === 'multi-item') return `${items.filter(item => !item.optional).length}コンポーネント`;
  return items.map(item => item.itemName).join(' + ');
}

function cardMarkup(encounter, index) {
  const meta = mechanics[encounter.mechanic];
  const total = accessTotal(encounter, index);
  const shownDrops = encounter.drops
    .map(drop => ({ ...drop, price: getPrice(drop.itemName, index) }))
    .filter(drop => state.showUnknown || drop.price)
    .sort((a, b) => (b.price?.value ?? -1) - (a.price?.value ?? -1))
    .slice(0, 3);
  const accessPrice = total ? formatPrice(total) : requiredAccess(encounter).length ? '—' : '進行条件';
  const accessHint = total ? '合計参加費' : requiredAccess(encounter).length ? '市場価格なし' : 'トレード不可';
  return `<article class="encounter-card" data-id="${encounter.id}">
    <header class="card-head"><div><div class="meta"><span class="mechanic ${meta.tone}">${escapeHtml(meta.label)}</span><span class="tier-pill">${encounter.tier === 'primary' ? '主要' : '依存'}</span><span class="location">${escapeHtml(encounter.location)}</span></div><h2>${escapeHtml(encounter.name)}</h2></div><button class="detail-button" type="button" data-detail="${encounter.id}" aria-label="${escapeHtml(encounter.name)}の詳細">↗</button></header>
    <div class="card-body"><div class="access"><div class="access-copy"><p class="label">ACCESS</p><p class="access-name">${escapeHtml(accessSummary(encounter, index))}</p></div><div class="cost"><small>${accessHint}</small><strong>${accessPrice}</strong></div></div>
    <div class="drop-head"><span class="label">NOTABLE DROPS</span><span class="label">CHANCE</span><span class="label">PRICE</span></div>
    ${shownDrops.length ? shownDrops.map(drop => `<div class="drop"><div class="drop-name"><strong title="${escapeHtml(drop.itemName)}">${escapeHtml(drop.itemName)}</strong>${trendMarkup(drop.price)}</div><div class="chance">${probabilityMarkup(drop.probability)}</div><div class="price">${formatPrice(drop.price)}</div></div>`).join('') : '<div class="no-drops">表示できるドロップがありません</div>'}
    <footer class="card-footer"><span>Drop data · ${escapeHtml(encounter.source.patch)}</span><span>${encounter.source.notes?.match(/n=\d+/)?.[0] || 'sample —'}</span></footer></div></article>`;
}

function filteredEncounters() {
  const query = normalize(state.query);
  const index = priceIndex();
  const list = encounters.filter(encounter => {
    const haystack = [encounter.name, encounter.location, ...encounter.aliases, ...encounter.access.items.map(item => item.itemName), ...encounter.drops.map(drop => drop.itemName)].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (state.mechanic === 'all' || encounter.mechanic === state.mechanic) && (state.tier === 'all' || encounter.tier === state.tier);
  });
  return list.sort((a, b) => {
    if (state.sort === 'name') return a.name.localeCompare(b.name);
    if (state.sort === 'access') return (accessTotal(b, index)?.value ?? -1) - (accessTotal(a, index)?.value ?? -1);
    return topDropValue(b, index) - topDropValue(a, index);
  });
}

function render() {
  const list = filteredEncounters();
  const index = priceIndex();
  elements.cards.innerHTML = list.map(encounter => cardMarkup(encounter, index)).join('');
  elements.count.textContent = String(list.length);
  elements.empty.hidden = list.length !== 0;
  document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.detail)));
}

function accessRows(encounter, index) {
  const items = encounter.access.items || [];
  if (!items.length) return '<p class="detail-note">市場で価格化できる単一キーはありません。</p>';
  return `<div class="access-list">${items.map(item => {
    const price = item.priceable === false ? null : getPrice(item.itemName, index);
    return `<div><span>${escapeHtml(item.itemName)} <small>×${item.quantity}${item.optional ? ' · 任意' : ''}</small></span><strong>${formatPrice(price)}</strong></div>`;
  }).join('')}</div>`;
}

function dependencyMarkup(encounter) {
  const ids = encounter.access.prerequisiteEncounterIds || [];
  if (!ids.length) return '';
  return `<div class="dependency"><span>${ids.map(id => escapeHtml(byId.get(id)?.name || id)).join(' + ')}</span><b>↓</b><span>${escapeHtml(encounter.access.items?.[0]?.itemName || encounter.name)}</span><b>↓</b><strong>${escapeHtml(encounter.name)}</strong></div>`;
}

function detailDropRows(encounter, index) {
  return encounter.drops.map(drop => {
    const price = getPrice(drop.itemName, index);
    const p = drop.probability || { type: 'unknown' };
    const sourceMeta = p.type === 'unknown' ? `不明 · ${p.patch || encounter.source.patch}` : `${p.patch || encounter.source.patch}${p.sampleSize ? ` · n=${p.sampleSize}` : ''}`;
    return `<tr><td><strong>${escapeHtml(drop.itemName)}</strong><small>${escapeHtml(drop.kind)}${drop.notes ? ` · ${escapeHtml(drop.notes)}` : ''}</small></td><td>${probabilityMarkup(p)}<small>${sourceMeta}</small></td><td class="mono">${formatPrice(price)}</td><td>${trendMarkup(price)}</td></tr>`;
  }).join('');
}

function openDetail(id) {
  const encounter = byId.get(id);
  if (!encounter) return;
  const index = priceIndex();
  const meta = mechanics[encounter.mechanic];
  const total = accessTotal(encounter, index);
  elements.detail.innerHTML = `<header class="detail-header"><div><div class="meta"><span class="mechanic ${meta.tone}">${escapeHtml(meta.label)}</span><span class="location">${escapeHtml(encounter.location)}</span></div><h2 id="detail-title">${escapeHtml(encounter.name)}</h2>${encounter.aliases.length ? `<p>Aliases · ${encounter.aliases.map(escapeHtml).join(', ')}</p>` : ''}</div><button class="dialog-close" type="button" aria-label="閉じる">×</button></header>
    <div class="detail-body"><section><div class="detail-section-title"><span>ACCESS</span>${total ? `<strong>合計 ${formatPrice(total)}</strong>` : ''}</div>${accessRows(encounter, index)}${dependencyMarkup(encounter)}<p class="detail-note">${escapeHtml(encounter.access.notes || '')}</p></section>
    <section><div class="detail-section-title"><span>DROPS</span><small>市場価格の高い順ではなく定義順</small></div><div class="table-wrap"><table><thead><tr><th>アイテム</th><th>ドロップ確率</th><th>現在価格</th><th>直近推移</th></tr></thead><tbody>${detailDropRows(encounter, index)}</tbody></table></div></section>
    <section class="source-panel"><div><span>SOURCE / FRESHNESS</span><strong>Drop data · Patch ${escapeHtml(encounter.source.patch)}</strong><p>${escapeHtml(encounter.source.notes || '確率データがない項目は不明として表示しています。')}</p></div><a href="${escapeHtml(encounter.source.url)}" target="_blank" rel="noreferrer">poe2wikiで確認 ↗</a></section></div>`;
  elements.detail.querySelector('.dialog-close').addEventListener('click', () => elements.dialog.close());
  elements.dialog.showModal();
}

function setStatus(market) {
  const label = elements.status.querySelector('span');
  const dot = elements.status.querySelector('i');
  dot.classList.toggle('stale', market.source !== 'live');
  if (market.source === 'unavailable') { label.textContent = '市場データを利用できません'; return; }
  const time = new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(market.fetchedAt));
  label.textContent = `${market.league} · ${time} JST${market.source === 'stale' ? '（保存データ）' : ''}`;
}

async function loadMarket() {
  try {
    const response = await fetch('/api/market', { headers: { Accept:'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.market = await response.json();
  } catch {
    state.market = { source:'unavailable', items:[], fetchedAt:null, league:'Runes of Aldur' };
  }
  setStatus(state.market);
  render();
}

for (const [key, meta] of Object.entries(mechanics)) elements.mechanic.insertAdjacentHTML('beforeend', `<option value="${key}">${escapeHtml(meta.label)}</option>`);
elements.search.addEventListener('input', event => { state.query = event.target.value; render(); });
elements.mechanic.addEventListener('change', event => { state.mechanic = event.target.value; render(); });
elements.tier.addEventListener('change', event => { state.tier = event.target.value; render(); });
elements.unknown.addEventListener('change', event => { state.showUnknown = event.target.checked; render(); });
elements.sort.addEventListener('change', event => { state.sort = event.target.value; render(); });
elements.dialog.addEventListener('click', event => { if (event.target === elements.dialog) elements.dialog.close(); });

render();
loadMarket();
