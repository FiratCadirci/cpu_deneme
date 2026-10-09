/**
 * FCFS — First Come First Serve (İlk Gelen İlk Çalışır)
 *
 * Kural: Hazır kuyrukta en erken gelen process seçilir. Aynı anda gelenlerde girilen sıra korunur.
 * Kesmesizdir: CPU'yu alan process işi bitene kadar bırakmaz.
 *
 * Artı: Basit ve adil (sıra kimseye kaymaz).
 * Eksi: Önde uzun bir iş varsa arkasındaki kısa işler de onu bekler ("konvoy etkisi").
 */
(function (CodeFlow) {
  'use strict';

  const { NonPreemptiveAlgorithm, compareByArrival } = CodeFlow.algorithms;

  class FCFS extends NonPreemptiveAlgorithm {
    constructor() {
      super({
        id: 'fcfs',
        name: 'First Come First Serve',
        shortName: 'FCFS',
        description: 'Önce gelen önce çalışır; başlayan iş bitene kadar CPU\'yu bırakmaz.',
      });
    }

    compare(a, b) {
      return compareByArrival(a, b);
    }
  }

  CodeFlow.algorithms.FCFS = FCFS;
  CodeFlow.algorithms.register(new FCFS());
})(window.CodeFlow);
