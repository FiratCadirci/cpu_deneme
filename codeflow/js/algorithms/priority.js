/**
 * Priority Scheduling (Öncelikli Zamanlama), kesmesiz (non-preemptive) sürüm
 *
 * Kural: CPU boşaldığında hazır kuyruktaki en öncelikli process seçilir.
 * KÜÇÜK sayı = YÜKSEK öncelik (1, 3'ten önce çalışır). Bu, proje başında alınan bir karardır.
 * Eşit öncelikte önce erken gelen, o da eşitse girilen sıra kazanır (yani FCFS'e döner).
 * Kesmesizdir: daha öncelikli bir iş gelse bile çalışan process yarıda kesilmez.
 *
 * Artı: Önemli işler öne alınabilir.
 * Eksi: Düşük öncelikli işler hiç sıra alamayabilir (starvation); çözümü "aging"dir.
 */
(function (CodeFlow) {
  'use strict';

  const { NonPreemptiveAlgorithm, compareByArrival } = CodeFlow.algorithms;

  class PriorityScheduling extends NonPreemptiveAlgorithm {
    constructor() {
      super({
        id: 'priority',
        name: 'Priority Scheduling',
        shortName: 'Priority',
        usesPriority: true,
        description: 'CPU boşalınca en öncelikli iş seçilir (küçük sayı = yüksek öncelik); çalışan iş kesilmez.',
      });
    }

    compare(a, b) {
      return a.priority - b.priority || compareByArrival(a, b);
    }
  }

  CodeFlow.algorithms.PriorityScheduling = PriorityScheduling;
  CodeFlow.algorithms.register(new PriorityScheduling());
})(window.CodeFlow);
