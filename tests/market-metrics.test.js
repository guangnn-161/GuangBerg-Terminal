const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateBookMetrics,
  calculateMovement,
  formatQuantity,
  updateMovementWindow,
  formatSignedPercent,
} = require('../js/market-metrics.js');

test('calculates spread, microprice, and top-of-book pressure from a depth snapshot', () => {
  const metrics = calculateBookMetrics(
    [['100.00', '4'], ['99.50', '2']],
    [['101.00', '1'], ['101.50', '3']],
  );

  assert.equal(metrics.bestBid, 100);
  assert.equal(metrics.bestAsk, 101);
  assert.equal(metrics.spread, 1);
  assert.equal(metrics.spreadBps, 99.5);
  assert.equal(metrics.microprice, 100.8);
  assert.equal(metrics.bidPressure, 60);
  assert.equal(metrics.askPressure, 40);
});

test('keeps a rolling market-movement window and reports the return and range', () => {
  let window = [];
  window = updateMovementWindow(window, { timestamp: 0, price: 100 }, 60_000);
  window = updateMovementWindow(window, { timestamp: 20_000, price: 104 }, 60_000);
  window = updateMovementWindow(window, { timestamp: 61_000, price: 102 }, 60_000);

  assert.deepEqual(window, [
    { timestamp: 20_000, price: 104 },
    { timestamp: 61_000, price: 102 },
  ]);

  assert.deepEqual(calculateMovement(window), {
    changePercent: -1.92,
    high: 104,
    low: 102,
  });
});

test('formats signed percentage changes consistently', () => {
  assert.equal(formatSignedPercent(0.1234), '+0.12%');
  assert.equal(formatSignedPercent(-0.1234), '-0.12%');
  assert.equal(formatSignedPercent(0), '+0.00%');
});

test('keeps meaningful precision for small BTC quantities', () => {
  assert.equal(formatQuantity(1.25), '1.250');
  assert.equal(formatQuantity(0.01234), '0.0123');
  assert.equal(formatQuantity(0.000019), '0.000019');
});
