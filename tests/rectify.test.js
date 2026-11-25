/* Unit tests for the rectification loop core (rectify.js pure functions).
   Run: npm test  (node --test, no dependencies) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../rectify.js');

test('matOf: lowest benchmark wins (1% turnover vs 5% PBT vs 1% net worth)', () => {
  // turnover 100cr -> 1cr; profit 10cr -> 50L; networth 50cr -> 50L. Lowest = 50L (₹5,000,000).
  const m = R.matOf({ turnover: 100, profit: 10, networth: 50 });
  assert.equal(m.overall, 5000000);
  assert.equal(m.perf, 3000000);
  assert.equal(m.trivial, 250000);
  assert.equal(m.basis, '5% of profit before tax');
});

test('matOf: auditor override wins over benchmarks', () => {
  const m = R.matOf({ turnover: 100, profit: 10, networth: 50, mat: { overall: 123456 } });
  assert.equal(m.overall, 123456);
  assert.equal(m.basis, 'Auditor override');
});

test('matOf: no figures -> zero, no crash', () => {
  const m = R.matOf({});
  assert.equal(m.overall, 0);
  assert.equal(m.perf, 0);
});

test('matAssess: thresholds', () => {
  const m = { overall: 100000, perf: 60000, trivial: 5000 };
  assert.equal(R.matAssess(150000, m).level, 'overall');
  assert.equal(R.matAssess(70000, m).level, 'perf');
  assert.equal(R.matAssess(10000, m).level, 'trivial');
  assert.equal(R.matAssess(1000, m).level, 'below');
  assert.equal(R.matAssess(0, m).level, 'unknown');
});

test('journalTest: flags cut-off, round, Sunday, narration, duplicate, large', () => {
  const rows = [
    { d: '2026-03-31', party: 'ABC Traders', amount: 50000, nar: 'Adjustment entry' },   // period-end + narration + large
    { d: '2026-03-15', party: 'XYZ Ltd', amount: 20000, nar: 'Purchase invoice' },        // round
    { d: '2026-03-08', party: 'Sunday Co', amount: 1234, nar: 'Receipt' },                // 2026-03-08 is a Sunday
    { d: '2026-03-10', party: 'Dup Party', amount: 7777, nar: 'Payment' },
    { d: '2026-03-10', party: 'Dup Party', amount: 7777, nar: 'Payment' },                 // duplicate
    { d: '2026-03-12', party: 'Normal Co', amount: 4321, nar: 'Receipt' },                // clean
  ];
  const J = R.journalTest(rows, { materiality: 40000 });
  assert.equal(J.rows, 6);
  const byKey = Object.fromEntries(J.res.map(r => [r.key, r]));
  assert.ok(byKey.cutoff.total >= 1, 'cut-off flagged');
  assert.ok(byKey.round.total >= 1, 'round flagged');
  assert.ok(byKey.large.total >= 1, 'large flagged');
  assert.ok(byKey.sunday.total >= 1, 'sunday flagged');
  assert.ok(byKey.narration.total >= 1, 'narration flagged');
  assert.equal(byKey.duplicate.total, 2, 'both duplicates flagged');
  // clean row must not appear in any hits list
  for (const r of J.res) assert.ok(!r.hits.some(h => h.party === 'Normal Co'), r.key + ' must not flag clean row');
});

test('journalTest: without materiality, large test is empty but others run', () => {
  const J = R.journalTest([{ d: '2026-03-31', party: 'A', amount: 999999, nar: 'x' }], {});
  assert.equal(J.res.find(r => r.key === 'large').total, 0);
  assert.ok(J.res.find(r => r.key === 'cutoff').total >= 1);
});

test('findingGaps / findingReady: SIA 370 quality gate', () => {
  assert.equal(R.findingReady({ title: 't', condition: 'c', criteria: 'c', cause: 'c', effect: 'e', rec: 'r', owner: 'o', due: '2026-12-31' }), true);
  const gaps = R.findingGaps({ title: 't', condition: 'c' });
  assert.ok(gaps.includes('Criteria') && gaps.includes('Cause') && gaps.includes('Target date'));
  assert.equal(R.findingReady({}), false);
});

test('closureGaps: high risk needs evidence and re-test note', () => {
  assert.ok(R.closureGaps({ rating: 'H', status: 'Open' }).length >= 2);
  assert.equal(R.closureGaps({ rating: 'H', status: 'Open', evidence: ['e1'], verify: { note: 're-tested' } }).length, 0);
  assert.equal(R.closureGaps({ rating: 'L', status: 'Open' }).length, 0);
  assert.ok(R.closureGaps({ rating: 'L', status: 'Closed' }).includes('Closure not verified (SIA 390)'));
});

test('opinionFor: stated criteria', () => {
  const today = '2026-11-25';
  assert.equal(R.opinionFor([{ rating: 'H', status: 'Open', due: '2026-01-01' }], today), 'Unsatisfactory'); // overdue H
  assert.equal(R.opinionFor([{ rating: 'H', status: 'Open', due: '2027-01-01', repeat: true }], today), 'Unsatisfactory'); // repeat H
  assert.equal(R.opinionFor([{ rating: 'M', status: 'Open', due: '2027-01-01' }], today), 'Needs improvement');
  assert.equal(R.opinionFor([{ rating: 'L', status: 'Open', due: '2027-01-01' }], today), 'Satisfactory');
  assert.equal(R.opinionFor([], today), 'Satisfactory');
});

test('escalationList: only overdue>30d high or repeats', () => {
  const today = '2026-11-25';
  const obs = [
    { id: '1', rating: 'H', status: 'Open', due: '2026-10-01' },   // 55 days late -> escalate
    { id: '2', rating: 'H', status: 'Open', due: '2026-11-20' },   // 5 days late -> no
    { id: '3', rating: 'M', status: 'Open', due: '2026-01-01', repeat: true }, // repeat -> escalate
    { id: '4', rating: 'H', status: 'Closed', due: '2026-01-01' }, // closed -> no
  ];
  const L = R.escalationList(obs, today).map(o => o.id);
  assert.deepEqual(L.sort(), ['1', '3']);
});
