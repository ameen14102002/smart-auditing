/* PDF statements read as rows (pdfrows.js): columns from the header, amounts by their right edge, a narration on two lines joined,
   the header repeated on the next page read once. Words are given with their positions, as pdf.js gives them. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../pdfrows.js');
const w = (s, x, y, cw = 4) => ({ s, x, y, w: s.length * cw, h: 8 });
const head = y => [w('Date', 25, y), w('Narration', 70, y), w('Withdrawal', 400, y), w('Deposit', 470, y), w('Balance', 540, y)];
test('a bank statement over two pages', () => {
  const p1 = [...head(800),
    w('01/04/26', 25, 786), w('NEFT DR-SUPPLIER ONE', 70, 786), w('12,500.00', 410, 786), w('87,500.00', 540, 786),
    w('-PAYMENT FOR BILL 12', 70, 776),
    w('02/04/26', 25, 762), w('UPI CUSTOMER', 70, 762), w('5,000.00', 478, 762), w('92,500.00', 540, 762)];
  const p2 = [...head(800), w('03/04/26', 25, 786), w('CHQ 000123', 70, 786), w('1,000.00', 414, 786), w('91,500.00', 540, 786)];
  const R = P.rowsOf([p1, p2]);
  assert.deepEqual(R[0], ['Date', 'Narration', 'Withdrawal', 'Deposit', 'Balance']);
  assert.equal(R.length, 4);
  assert.deepEqual(R[1], ['01/04/26', 'NEFT DR-SUPPLIER ONE -PAYMENT FOR BILL 12', '12,500.00', '', '87,500.00']);
  assert.deepEqual(R[2], ['02/04/26', 'UPI CUSTOMER', '', '5,000.00', '92,500.00']);
  assert.equal(R[3][2], '1,000.00');
});
test('two amounts printed close together stay two cells', () => {
  const L = P.linesOf([w('21,020.27', 470, 700), w('121,020.27', 470 + 9 * 4 + 1, 700)]);
  assert.equal(L[0].cells.length, 2);
});
