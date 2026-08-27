import assert from 'node:assert/strict';
import test from 'node:test';
import { projectPoints } from './projections';

test('exact at QB anchors', () => {
  assert.equal(projectPoints('QB', 1), 400);
  assert.equal(projectPoints('QB', 12), 310);
});

test('monotone non-increasing 1..80 for every position', () => {
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const) {
    let prev = Infinity;
    for (let r = 1; r <= 80; r++) {
      const y = projectPoints(pos, r);
      assert.ok(y <= prev + 1e-9, `${pos} ${r}`);
      prev = y;
    }
  }
});
