import assert from 'node:assert/strict';
import test from 'node:test';
import { mulberry32 } from './rng';

test('mulberry32 is deterministic and two seeds diverge', () => {
  const a = mulberry32(1);
  const b = mulberry32(1);
  const c = mulberry32(2);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  assert.notEqual(mulberry32(1)(), c());
});
