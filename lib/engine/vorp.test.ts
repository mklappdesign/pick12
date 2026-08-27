import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import { deriveBaselines } from './baselines';
import { effectiveVorp } from './vorp';

test('K pinned at round 10, unpinned at 14', () => {
  const b = deriveBaselines(DEFAULT_CONFIG);
  const pinned = effectiveVorp('K', 1, b, 10, 15);
  const late = effectiveVorp('K', 1, b, 14, 15);
  assert.equal(pinned, -50);
  assert.ok(late > pinned);
});
