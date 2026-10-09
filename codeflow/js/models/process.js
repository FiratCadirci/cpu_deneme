/**
 * Process modeli
 *
 * Process, CPU'da çalışmak isteyen bir programdır. Simülasyon için bilmemiz gerekenler:
 *   id          → 'P1' gibi bir isim
 *   arrivalTime → sisteme geldiği an (Arrival Time)
 *   burstTime   → CPU'da çalışması gereken toplam süre (Burst Time)
 *   priority    → öncelik; KÜÇÜK sayı = YÜKSEK öncelik (1, 3'ten daha önceliklidir)
 *   index       → kullanıcının girdiği sıra; diğer her şey eşitse kimin önce seçileceğini belirler
 *
 * @typedef {Object} Process
 * @property {string} id
 * @property {number} arrivalTime
 * @property {number} burstTime
 * @property {number} priority
 * @property {number} index
 */
(function (CodeFlow) {
  'use strict';

  const { isBlank } = CodeFlow.utils;

  const DEFAULT_PRIORITY = 1;

  const LIMITS = Object.freeze({
    maxProcesses: 1000,
    maxTime: 100000, // arrival ve burst için üst sınır
    maxTotalBurst: 100000, // tüm burst'lerin toplamı; tarayıcı donmasın diye (RR, q=1 → en fazla 100.000 dilim)
    maxPriority: 999,
    maxIdLength: 16,
  });

  /**
   * Ham girdiden (form satırı, dataset) değiştirilemez bir Process üretir.
   * Girdinin geçerli olduğunu varsayar; doğrulama ProcessManager'ın işidir.
   */
  function create(input, index) {
    return Object.freeze({
      id: String(input.id).trim(),
      arrivalTime: Number(input.arrivalTime),
      burstTime: Number(input.burstTime),
      priority: isBlank(input.priority) ? DEFAULT_PRIORITY : Number(input.priority),
      index,
    });
  }

  CodeFlow.models.Process = { create, DEFAULT_PRIORITY, LIMITS };
})(window.CodeFlow);
