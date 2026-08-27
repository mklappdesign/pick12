import assert from 'node:assert/strict';
import test from 'node:test';
import { adpOnlySurvival } from './adpOnlySurvival';

test('early ADP barely survives a 22-pick gap; late ADP does', () => {
  assert.ok(adpOnlySurvival(1, 36, 3) < 0.05);
  assert.ok(adpOnlySurvival(200, 36, 3) > 0.95);
});

test('null adp survives', () => assert.equal(adpOnlySurvival(null, 36, null), 1));
