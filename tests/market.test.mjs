import test from 'node:test';
import assert from 'node:assert/strict';

import { deduplicatePrices, normalizeExchange, normalizeName, normalizeStash } from '../server/market.mjs';

test('exchange data resolves exact canonical names', () => {
  const items = normalizeExchange({ core:{ primary:'ex', items:[{ id:'ex', name:'Exalted Orb' }, { id:'key', name:'Breachlord Sac', icon:'key.png' }] }, lines:[{ id:'key', primaryValue:12, volumePrimaryValue:80, sparkline:[10,12] }] }, 'Fragments');
  assert.equal(items[0].itemName, 'Breachlord Sac');
  assert.equal(items[0].value, 12);
  assert.deepEqual(items[0].sparkline, [10,12]);
});

test('stash normalization preserves unknown listing fields safely', () => {
  const items = normalizeStash({ core:{ primary:{ name:'Exalted Orb' } }, lines:[{ id:'unique', name:'The Adorned', primaryValue:4.2, sparkLine:{ data:[4,4.2] } }] }, 'UniqueJewel');
  assert.equal(items[0].currency, 'Exalted Orb');
  assert.equal(items[0].listingCount, undefined);
});

test('duplicate names from different categories are marked ambiguous', () => {
  const duplicate = deduplicatePrices([{ id:'1', itemName:'Same Name', sourceCategory:'A', value:1 }, { id:'2', itemName:'Same Name', sourceCategory:'B', value:2 }]);
  assert.equal(duplicate[0].ambiguous, true);
});

test('name normalization is exact and punctuation-safe', () => {
  assert.equal(normalizeName(' Raven’s   Reflection '), "raven's reflection");
  assert.notEqual(normalizeName('Raven Reflection'), normalizeName("Raven's Reflection"));
});
