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
test('payments made before the bill under its reference settle it when it comes (Blossom: Icube SO0052)', () => {
  const P2 = [
    ['2026-04-24', 'y', 'ITC Payment', '', 'Icube', 1, 25000, [['SO0052', 'A', 25000, 1, 0]], '', '', 1, 'HDFC Bank'],
    ['2026-06-05', 'p', 'GST ITC', 'ITC/55', 'Icube', 0, 224672, [['SO0052', 'A', 224672, 0, 0]], '', '', 2, 'Software'],
    ['2026-06-21', 'y', 'ITC Payment', '', 'Icube', 1, 25000, [['SO0052', 'A', 25000, 1, 0]], '', '', 3, 'HDFC Bank']
  ];
  const r = S.calc({ P: P2, X: [], from: '2026-04-01', to: '2026-10-31' }, 'P', { asOf: '2026-10-31' });
  assert.equal(r.bills[0].rem, 174672);
  assert.equal(r.opening.length, 0);
  assert.equal(r.tie[0].diff, 0);
});
test('advances of last year from the ledger masters settle this year\'s bill (owner: Icube paid in Jan / Feb 2026)', () => {
  const X = '<LEDGER NAME="Icube"><PARENT>Sundry Creditors</PARENT><OPENINGBALANCE>-150000.00</OPENINGBALANCE>' +
    '<BILLALLOCATIONS.LIST><BILLDATE>20260120</BILLDATE><NAME>SO0052</NAME><ISADVANCE>Yes</ISADVANCE><OPENINGBALANCE>-150000.00</OPENINGBALANCE></BILLALLOCATIONS.LIST></LEDGER>';
  const O = S.parseOpening(X);
  assert.equal(O.L.Icube.bills[0].amt, 150000);
  const P2 = [['2026-06-05', 'p', 'GST ITC', 'ITC/55', 'Icube', 0, 224672, [['SO0052', 'A', 224672, 0, 0]], '', '', 2, 'Software'],
    ['2026-06-21', 'y', 'ITC Payment', '', 'Icube', 1, 100000, [['SO0052', 'A', 100000, 1, 0]], '', '', 3, 'HDFC Bank']];
  const r = S.calc({ P: P2, X: [], from: '2026-04-01', to: '2026-10-31' }, 'P', { asOf: '2026-10-31', open: O });
  const b = r.bills.find(x => x.vt !== 'Opening balance');
  assert.equal(b.rem, 0);
  assert.equal(Math.round(r.pool.reduce((t, u) => t + u.rem, 0)), 25328);   // paid 2,50,000 against 2,24,672
});
