/**
 * Sayı biçimlendirme — Türkçe yazım kurallarıyla (ondalık ayırıcı virgül, yüzde işareti başta)
 *
 *   format.decimal(4.75)        → "4,75"
 *   format.percent(0.5294)      → "%52,9"
 *   format.metric('cpuUtilization', 1) → "%100"
 */
(function (CodeFlow) {
  'use strict';

  const cache = new Map();

  function formatter(options) {
    const key = JSON.stringify(options);
    if (!cache.has(key)) cache.set(key, new Intl.NumberFormat('tr-TR', options));
    return cache.get(key);
  }

  function decimal(value, digits = 2) {
    if (!Number.isFinite(value)) return '—';
    return formatter({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  }

  function integer(value) {
    if (!Number.isFinite(value)) return '—';
    return formatter({ maximumFractionDigits: 0 }).format(value);
  }

  /** 0–1 arası oranı yüzdeye çevirir. Tam sayıysa ondalık göstermez: 1 → "%100", 0.5294 → "%52,9" */
  function percent(ratio, digits = 1) {
    if (!Number.isFinite(ratio)) return '—';
    const isWhole = Math.abs(ratio * 100 - Math.round(ratio * 100)) < 1e-9;
    return formatter({ style: 'percent', minimumFractionDigits: isWhole ? 0 : digits, maximumFractionDigits: isWhole ? 0 : digits }).format(ratio);
  }

  /** Simülasyon zamanı (tam sayı): 12 → "12" */
  function time(value) {
    return integer(value);
  }

  /**
   * AlgorithmComparator.METRICS'teki bir metriği kendi formatıyla yazar.
   * @param {string|Object} metric  metrik anahtarı ('avgWaitingTime') ya da METRICS elemanı
   */
  function metric(metric, value) {
    const descriptor = typeof metric === 'string'
      ? CodeFlow.comparison.AlgorithmComparator.METRICS.find((m) => m.key === metric)
      : metric;
    switch (descriptor && descriptor.format) {
      case 'percent':
        return percent(value);
      case 'decimal3':
        return decimal(value, 3);
      case 'integer':
        return integer(value);
      default:
        return decimal(value, 2);
    }
  }

  CodeFlow.ui.format = { decimal, integer, percent, time, metric };
})(window.CodeFlow);
