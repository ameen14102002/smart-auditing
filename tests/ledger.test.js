/* Ledger scrutiny engine (ledger-engine.js): groups from names, and the main tests on a small made-up Day Book. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../ledger-engine.js');
const V = [
  ['2026-04-05', 'Payment', 'P1', 'paid labour', [['Loading Labour Charges', 1, 12000], ['Main Cash A/c', 0, 12000]]],
  ['2026-04-10', 'Journal', 'J1', 'Consultancy for April', [['Professional Fees', 1, 60000], ['Ravi & Co', 0, 60000]]],
  ['2026-04-12', 'Purchase', 'GRN/1', '', [['Purchase Local', 1, 1000], ['CGST ITC', 1, 90], ['SGST ITC', 1, 90], ['Ravi Traders', 0, 1180]]],
  ['2026-04-15', 'Payment', 'P2', 'car service', [['Car Repair Expenses', 1, 5000], ['CGST ITC', 1, 450], ['SGST ITC', 1, 450], ['HDFC Bank', 0, 5900]]],
  ['2026-04-20', 'Journal', 'J2', '', [['Suspense A/c', 1, 2500], ['HDFC Bank', 0, 2500]]],
  ['2026-04-26', 'Payment', 'P3', 'Rent for Mar\'26', [['Office Rent', 1, 20000], ['HDFC Bank', 0, 20000]]],
  ['2026-04-30', 'Journal', 'J3', '', [['General Expenses', 1, 50000], ['Director Loan', 0, 50000]]]
];
const R = L.scrutinise({ V, groups: {}, from: '2026-04-01', to: '2026-04-30' });
const has = k => R.F.find(f => f.k === k);
test('ledger groups from names', () => {
  assert.equal(R.cls['Main Cash A/c'], 'cash'); assert.equal(R.cls['HDFC Bank'], 'bank'); assert.equal(R.cls['CGST ITC'], 'tax');
  assert.equal(R.cls['Professional Fees'], 'exp'); assert.equal(R.cls['Suspense A/c'], 'susp'); assert.equal(R.cls['Ravi Traders'], 'party');
});
test('cash over ₹10,000 in a day', () => assert.equal(has('cash40a').items[0].ledger, 'Loading Labour Charges'));
test('professional fees over ₹50,000 with no TDS', () => assert.ok(has('tds').items.some(x => x.ledger === 'Professional Fees')));
test('GST credit on car repairs is flagged as blocked', () => assert.ok(has('blocked').items.some(x => /Car Repair/.test(x.ledger))));
test('suspense in use, and an earlier year\'s rent', () => { assert.ok(has('susp')); assert.ok(has('prior').items.some(x => x.ledger === 'Office Rent')); });
test('a round-sum journal at the month end with no narration', () => assert.ok(has('jv').items.some(x => /General Expenses/.test(x.ledger))));
