/**
 * Palette — process renkleri
 *
 * Aynı process her yerde (Gantt, tablolar, kuyruk, karşılaştırma) aynı renkte görünsün diye
 * renk, process'in tablodaki sırasına (index) göre seçilir. Hepsi beyaz yazıyla okunabilir koyulukta.
 */
(function (CodeFlow) {
  'use strict';

  const COLORS = Object.freeze([
    '#1c6dd0', // mavi
    '#c2410c', // turuncu
    '#15803d', // yeşil
    '#7e22ce', // mor
    '#be123c', // gül kırmızısı
    '#0e7490', // camgöbeği
    '#a16207', // hardal
    '#4338ca', // çivit
    '#b91c1c', // kırmızı
    '#0f766e', // deniz yeşili
    '#9d174d', // pembe
    '#4d7c0f', // zeytin
  ]);

  const IDLE_COLOR = '#c9d4e2';
  const TEXT_ON_COLOR = '#ffffff';

  function colorAt(index) {
    return COLORS[((index % COLORS.length) + COLORS.length) % COLORS.length];
  }

  /**
   * process id → renk eşlemesi.
   * @param {Array<{id: string}>} processes  tablodaki sırasıyla (örn. result.processes)
   * @returns {Map<string, string>}
   */
  function colorMap(processes) {
    return new Map(processes.map((p, i) => [p.id, colorAt(i)]));
  }

  CodeFlow.visualization.palette = { COLORS, IDLE_COLOR, TEXT_ON_COLOR, colorAt, colorMap };
})(window.CodeFlow);
