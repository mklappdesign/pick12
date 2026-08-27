import assert from 'node:assert/strict';
import test from 'node:test';
import { nameKey, normalizeName, stripSuffix } from './normalizeName';

test("Ja'Marr Chase → jamarrchase", () => {
  assert.equal(nameKey("Ja'Marr Chase"), 'jamarrchase');
});

test('Amon-Ra St. Brown keeps letters only after strip', () => {
  assert.equal(nameKey('Amon-Ra St. Brown'), 'amonrastbrown');
});

test('strips jr/sr/ii/iii/iv on the raw string', () => {
  assert.equal(nameKey('Marvin Harrison Jr.'), 'marvinharrison');
  assert.equal(nameKey('Kyle Pitts Sr.'), 'kylepitts');
  assert.equal(nameKey('James Cook III'), 'jamescook');
});

test('does not strip a trailing v', () => {
  assert.equal(stripSuffix('Lamar Jackson V'), 'Lamar Jackson V');
  assert.ok(nameKey('Lamar Jackson V').endsWith('v'));
});

test('normalizeName is lowercase letters-only', () => {
  assert.equal(normalizeName('José'), 'jose');
});
