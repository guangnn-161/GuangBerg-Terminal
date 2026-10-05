(function exposeMarketMetrics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MarketMetrics = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  function toNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function calculateBookMetrics(bids, asks) {
    const bestBid = toNumber(bids?.[0]?.[0]);
    const bestAsk = toNumber(asks?.[0]?.[0]);
    const bestBidQty = toNumber(bids?.[0]?.[1]);
    const bestAskQty = toNumber(asks?.[0]?.[1]);
    const bidVolume = (bids || []).reduce((sum, level) => sum + toNumber(level[1]), 0);
    const askVolume = (asks || []).reduce((sum, level) => sum + toNumber(level[1]), 0);
    const totalVolume = bidVolume + askVolume;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
    const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;
    const topVolume = bestBidQty + bestAskQty;

    return {
      bestBid,
      bestAsk,
      midPrice,
      spread,
      spreadBps: midPrice ? round((spread / midPrice) * 10_000, 2) : 0,
      microprice: topVolume ? round(((bestAsk * bestBidQty) + (bestBid * bestAskQty)) / topVolume, 2) : midPrice,
      bidVolume,
      askVolume,
      bidPressure: totalVolume ? round((bidVolume / totalVolume) * 100, 1) : 50,
      askPressure: totalVolume ? round((askVolume / totalVolume) * 100, 1) : 50,
    };
  }

  function updateMovementWindow(points, point, windowMs) {
    const earliest = point.timestamp - windowMs;
    return [...points, point].filter((item) => item.timestamp >= earliest);
  }

  function calculateMovement(points) {
    if (!points.length) return { changePercent: 0, high: 0, low: 0 };
    const first = points[0].price;
    const latest = points[points.length - 1].price;
    const prices = points.map((point) => point.price);
    return {
      changePercent: first ? round(((latest - first) / first) * 100, 2) : 0,
      high: Math.max(...prices),
      low: Math.min(...prices),
    };
  }

  function formatSignedPercent(value) {
    const number = Number(value) || 0;
    return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
  }

  function formatQuantity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '--';
    const digits = number >= 1 ? 3 : number >= 0.01 ? 4 : 6;
    return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  return {
    calculateBookMetrics,
    calculateMovement,
    formatQuantity,
    formatSignedPercent,
    updateMovementWindow,
  };
}));
