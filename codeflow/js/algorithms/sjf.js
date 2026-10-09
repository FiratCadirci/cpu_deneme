/**
 * SJF — Shortest Job First (En Kısa İş Önce), kesmesiz (non-preemptive) sürüm
 *
 * Kural: CPU boşaldığında hazır kuyruktaki en kısa Burst Time'lı process seçilir.
 * Eşitlikte önce erken gelen, o da eşitse girilen sıra kazanır.
 * Kesmesizdir: daha kısa bir iş gelse bile çalışan process yarıda kesilmez
 * (kesen sürümüne SRTF — Shortest Remaining Time First denir).
 *
 * Artı: Ortalama bekleme süresini düşürür (hepsi aynı anda gelirse en iyisidir).
 * Eksi: Uzun işler sürekli kısa işlerin arkasında kalıp aç kalabilir (starvation).
 */
(function (CodeFlow) {
  'use strict';

  const { NonPreemptiveAlgorithm, compareByArrival } = CodeFlow.algorithms;

  class SJF extends NonPreemptiveAlgorithm {
    constructor() {
      super({
        id: 'sjf',
        name: 'Shortest Job First',
        shortName: 'SJF',
        description: 'CPU boşalınca kuyruktaki en kısa iş seçilir; çalışan iş kesilmez.',
      });
    }

    compare(a, b) {
      return a.burstTime - b.burstTime || compareByArrival(a, b);
    }
  }

  CodeFlow.algorithms.SJF = SJF;
  CodeFlow.algorithms.register(new SJF());
})(window.CodeFlow);
