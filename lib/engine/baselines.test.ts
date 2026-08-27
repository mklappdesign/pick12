import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import { deriveBaselines } from './baselines';

test('default baselines', () => {
  const b = deriveBaselines(DEFAULT_CONFIG);
  assert.equal(b.QB, 13);
  assert.equal(b.TE, 13);
  assert.ok(b.RB >= 28 && b.RB <= 32);
  assert.ok(b.WR >= 42 && b.WR <= 46);
});
