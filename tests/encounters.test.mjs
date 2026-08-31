import test from 'node:test';
import assert from 'node:assert/strict';

import { encounters, validateEncounters } from '../web/data/encounters.js';

test('all encounter definitions validate', () => {
  assert.deepEqual(validateEncounters(encounters), []);
  assert.equal(encounters.length, 14);
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
