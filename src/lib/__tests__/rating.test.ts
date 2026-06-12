import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ratingDelta, formatDelta } from '../rating';

describe('ratingDelta', () => {
  it('equal ratings: win ≈ +16, loss ≈ −16 (half of K)', () => {
    assert.equal(ratingDelta(1000, 1000, true), 16);
    assert.equal(ratingDelta(1000, 1000, false), -16);
  });

  it('beating a far-stronger bot approaches +K', () => {
    const d = ratingDelta(1000, 2400, true);
    assert.ok(d >= 31 && d <= 32, `expected ~+32, got ${d}`);
  });

  it('losing to a far-weaker bot approaches −K', () => {
    const d = ratingDelta(2400, 320, false);
    assert.ok(d <= -31 && d >= -32, `expected ~−32, got ${d}`);
  });

  it('beating a far-weaker bot is a small gain, floored at +1', () => {
    const d = ratingDelta(2400, 320, true);
    assert.ok(d >= 1 && d <= 3, `expected a small positive, got ${d}`);
  });

  it('losing to a far-stronger bot is a small sting, floored at −1', () => {
    const d = ratingDelta(1000, 2400, false);
    assert.ok(d <= -1 && d >= -3, `expected a small negative, got ${d}`);
  });

  it('win is always positive, loss always negative', () => {
    for (const [p, b] of [[1000, 1000], [500, 2000], [2000, 500], [1234, 1187]]) {
      assert.ok(ratingDelta(p, b, true) >= 1, `win must be ≥ +1 (${p} vs ${b})`);
      assert.ok(ratingDelta(p, b, false) <= -1, `loss must be ≤ −1 (${p} vs ${b})`);
    }
  });

  it('is symmetric: a win delta mirrors the expected-score loss delta sign', () => {
    // beating an equal opponent gains what losing to them would cost
    assert.equal(ratingDelta(1500, 1500, true), -ratingDelta(1500, 1500, false));
  });
});

describe('formatDelta', () => {
  it('uses + for gains and the U+2212 minus for losses', () => {
    assert.equal(formatDelta(18), '+18');
    assert.equal(formatDelta(-7), '−7'); // U+2212, not a hyphen
    assert.equal(formatDelta(0), '+0');
  });
});
