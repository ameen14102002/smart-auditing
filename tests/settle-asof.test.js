/* The settlement ageing is taken on the date chosen (today, or the end of a month): entries dated after it have not happened yet.
   Owner, 28 Nov 2026 (Blossom: payments keyed in Tally up to two months ahead were read as paid, ageing ran to 30 Jan 2027). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../settle-engine.js');
// P rows: [date, kind, vtype, vno, party, dr, amount, allocations, narration, reference, index, other ledgers]
const P = [
  ['2026-09-10', 'p', 'Purchase', 'GRN/1', 'Teeny Toes', 0, 50000, [['B-1', 'N', 50000, 0, 0]], '', 'B-1', 1, 'Purchase'],
  ['2026-12-10', 'y', 'Stock Payment', '', 'Teeny Toes', 1, 50000, [['B-1', 'A', 50000, 1, 0]], '', '', 2, 'HDFC Bank'],
  ['2026-09-01', 'y', 'Payment', 'P-1', 'General Expenses', 1, 900, [['P-1', 'N', 900, 1, 0]], '', '', 3, 'Petty Cash'],
  ['2026-09-02', 'p', 'GST ITC', 'ITC/1', 'Telephone Expenses', 0, 1000, [['T-1', 'N', 1000, 0, 0]], '', '', 4, 'Airtel']
];
const D = { P, X: [], from: '2026-09-01', to: '2026-12-10' };
test('a payment dated after the ageing date does not close the bill', () => {
  const r = S.calc(D, 'P', { asOf: '2026-10-31' });
  const b = r.bills.find(x => x.party === 'Teeny Toes');
  assert.equal(b.rem, 50000);
  assert.equal(r.asOf, '2026-10-31');
  assert.equal(r.ageOf(b), 51);
  assert.equal(r.after.n, 1);
  assert.equal(r.after.amt, 50000);
});
test('on the payment date or later the bill is closed', () => {
  const r = S.calc(D, 'P', { asOf: '2026-12-31' });
  assert.equal(r.bills.find(x => x.party === 'Teeny Toes').rem, 0);
});
test('expense ledgers kept bill-wise are not suppliers', () => {
  const r = S.calc(D, 'P', { asOf: '2026-10-31' });
  assert.deepEqual(r.nonTrade.map(x => x.party).sort(), ['General Expenses', 'Telephone Expenses']);
  assert.ok(!r.bills.some(b => /Expenses/.test(b.party)) && !r.pool.some(u => /Expenses/.test(u.party)));
});
