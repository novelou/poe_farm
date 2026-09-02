import test from 'node:test';
import assert from 'node:assert/strict';

import { encounters, validateEncounters } from '../web/data/encounters.js';

test('all encounter definitions validate', () => {
  assert.deepEqual(validateEncounters(encounters), []);
  assert.equal(encounters.length, 14);
});

test('all displayed bosses and items have PoE2DB Japanese metadata', () => {
  for (const encounter of encounters) {
    assert.ok(encounter.nameJa);
    assert.match(encounter.poedbUrl, /^https:\/\/poe2db\.tw\/jp\//);
    for (const item of [...encounter.access.items, ...encounter.drops]) {
      assert.ok(item.nameJa, `${encounter.id}/${item.itemName}`);
      assert.match(item.poedbUrl, /^https:\/\/poe2db\.tw\/jp\//);
    }
  }
});

test('requested 0.5 boss currencies and lineage supports are present', () => {
  const drops = id => new Set(encounters.find(encounter => encounter.id === id).drops.map(drop => drop.itemName));
  for (const name of ['Ancient Jawbone', 'Ancient Rib', 'Ancient Collarbone']) assert.ok(drops('vessel-of-kulemak').has(name));
  for (const name of ["Atziri's Communion", "Architect's Orb", 'Core Destabiliser', 'Crystallised Corruption', 'Vaal Cultivation Orb', 'Vaal Catalysing Infuser']) assert.ok(drops('atziri').has(name));
  assert.ok(drops('bodach').has('Carved Majesty'));
  for (const name of ["Xoph's Pyre", "Tul's Stillness", "Esh's Radiance", "Uul-Netol's Embrace"]) assert.ok(drops('xesht').has(name));
});

test('empirical estimates carry sample sizes and source links', () => {
  const estimates = encounters.flatMap(encounter => encounter.drops).filter(drop => drop.probability.type === 'estimate');
  assert.ok(estimates.length >= 40);
  for (const drop of estimates) {
    assert.ok(drop.probability.approximate);
    assert.ok(drop.probability.sampleSize > 0);
    assert.match(drop.probability.source.url, /^https:\/\//);
  }
});

test('all prerequisites point to an existing encounter', () => {
  const ids = new Set(encounters.map(encounter => encounter.id));
  for (const encounter of encounters) for (const prerequisite of encounter.access.prerequisiteEncounterIds || []) assert.ok(ids.has(prerequisite));
});

test('unknown and guaranteed probabilities remain explicit', () => {
  const unknown = encounters.flatMap(encounter => encounter.drops).find(drop => drop.probability.type === 'unknown');
  const guaranteed = encounters.flatMap(encounter => encounter.drops).find(drop => drop.probability.type === 'guaranteed');
  assert.equal(unknown.probability.value, undefined);
  assert.equal(guaranteed.probability.type, 'guaranteed');
});

test('multi-item access totals only required components', () => {
  const olroth = encounters.find(encounter => encounter.id === 'olroth');
  const required = olroth.access.items.filter(item => !item.optional).reduce((sum, item) => sum + item.quantity, 0);
  assert.equal(required, 1);
});
