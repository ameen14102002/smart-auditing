/* Client logo clean-up: background removal, stray bits and cropping on plain RGBA arrays (no browser). */
const test = require('node:test'), assert = require('node:assert');
global.window = global; global.document = { addEventListener() {} };
require('../clogo.js');
const { process: clean, DEF } = window.LOGO;

/* a w×h image on an off-white page: a dark-blue 20×10 block (the logo) with a hole, and a grey speck far away */
function sample(w = 80, h = 50) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) d.set([250, 250, 250, 255], p * 4);
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set([...c, 255], (y * w + x) * 4); };
  fill(20, 15, 40, 25, [20, 40, 110]); fill(27, 18, 31, 22, [250, 250, 250]);   // logo with a hole like the inside of an O
  fill(75, 45, 77, 47, [150, 150, 150]);                                          // stray bit of the page
  return { d, w, h };
}
const alpha = (s, x, y) => s.d[(y * s.w + x) * 4 + 3];

test('removes the plain background, the stray bit and crops to the logo', () => {
  const s = sample(), r = clean(s.d, s.w, s.h, { ...DEF, holes: false });
  assert.ok(r.bg.plain && r.keyed);
  assert.deepStrictEqual(r.box, { x: 20, y: 15, w: 20, h: 10 });
  assert.strictEqual(alpha(s, 2, 2), 0);        // page made transparent
  assert.strictEqual(alpha(s, 76, 46), 0);      // speck dropped
  assert.strictEqual(alpha(s, 22, 16), 255);    // logo kept
  assert.strictEqual(alpha(s, 28, 19), 255);    // hole kept when not asked
  assert.strictEqual(r.light, false);
});
test('clears the inside of letters automatically on a white page', () => {
  const s = sample(), r = clean(s.d, s.w, s.h, { ...DEF });
  assert.ok(r.holes); assert.strictEqual(alpha(s, 28, 19), 0);
});
test('a white logo is marked light (goes on a dark tile) and keeps its white parts', () => {
  const w = 60, h = 40, d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) d.set([12, 60, 120, 255], p * 4);
  for (let y = 10; y < 30; y++) for (let x = 10; x < 50; x++) d.set([255, 255, 255, 255], (y * w + x) * 4);
  const r = clean(d, w, h, { ...DEF });
  assert.ok(r.light); assert.deepStrictEqual(r.box, { x: 10, y: 10, w: 40, h: 20 });
});
test('a busy (photo) background is kept, not eaten away', () => {
  const w = 40, h = 30, d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) d.set([(p * 53) % 255, (p * 97) % 255, (p * 31) % 255, 255], p * 4);
  const r = clean(d, w, h, { ...DEF });
  assert.strictEqual(r.bg.plain, false); assert.ok(r.box.w >= 38);
});
