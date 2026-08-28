import assert from 'node:assert/strict';
import test from 'node:test';
import { adpFromRank, parseFantasyProsCsv, splitCsvLine } from './fantasyPros';

const SAMPLE = `"RK",TIERS,"PLAYER NAME",TEAM,"POS","BYE WEEK","UPSIDE ","BUST ","SOS SEASON","ECR VS. ADP"
"1",1,"Ja'Marr Chase",CIN,"WR1","6","5 out of 5","1 out of 5","4 out of 5 stars","+2"
"",4
"27",4,"Kenneth Walker III",KC,"RB10","5","5 out of 5","4 out of 5","3 out of 5 stars","-9"
"199",11,"Cam Little",JAC,"K4","7","-","-","4 out of 5 stars","-51"
"513",16,"Jaret Patterson",LAC,"RB143","7","-","-","3 out of 5 stars","-"
`;

test('splitCsvLine keeps commas inside quotes', () => {
  assert.deepEqual(splitCsvLine('"a","b,c",d'), ['a', 'b,c', 'd']);
});

test('parseFantasyProsCsv skips blank RK and maps JAC→JAX', () => {
  const rows = parseFantasyProsCsv(SAMPLE);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].name, "Ja'Marr Chase");
  assert.equal(rows[0].position, 'WR');
  assert.equal(rows[0].posRank, 1);
  assert.equal(rows[1].name, 'Kenneth Walker III');
  const k = rows.find((r) => r.name === 'Cam Little');
  assert.equal(k?.team, 'JAX');
  assert.equal(k?.position, 'K');
});

test('adpFromRank uses ECR vs ADP when present', () => {
  const rows = parseFantasyProsCsv(SAMPLE);
  assert.equal(adpFromRank(rows[0]), 3);
  assert.equal(adpFromRank(rows[1]), 18);
  const noDelta = rows.find((r) => r.name === 'Jaret Patterson');
  assert.equal(noDelta && adpFromRank(noDelta), 513);
});
