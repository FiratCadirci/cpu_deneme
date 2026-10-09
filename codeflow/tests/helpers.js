/**
 * Testlerde ortak kullanılan kısayollar.
 */
(function (global) {
  'use strict';

  const CF = global.CodeFlow;

  global.T = {
    CF,

    /** Simülasyonu çalıştırır */
    run(algorithmId, processes, options) {
      return CF.engine.SimulationEngine.run(algorithmId, processes, options);
    },

    /** Hazır veri setinin process listesi */
    dataset(id) {
      return CF.scenarios.Datasets.get(id).processes;
    },

    /** Gantt çizelgesinin metin hâli: "P1 0-5 | IDLE 5-8 | P2 8-12" */
    gantt(result) {
      return CF.models.GanttEntry.formatTimeline(result.timeline);
    },

    /** Process başına tek bir alan: { P1: 0, P2: 4, ... } */
    column(result, key) {
      const out = {};
      for (const p of result.processes) out[p.id] = p[key];
      return out;
    },

    /** Olay kaydının metin hâli: ["0 arrive P1 [P1]", "0 dispatch P1 []", ...] */
    events(result) {
      return result.events.map((e) => `${e.time} ${e.type}${e.processId ? ' ' + e.processId : ''} [${e.queue.join(',')}]`);
    },

    /** Kısa process tanımı: proc('P1', 0, 5, 2) */
    proc(id, arrivalTime, burstTime, priority = 1) {
      return { id, arrivalTime, burstTime, priority };
    },
  };
})(window);
