/**
 * Simülasyon çıktısının modelleri
 *
 * GanttEntry → CPU'nun bir process'i kesintisiz çalıştırdığı zaman dilimi.
 *              processId null ise CPU o aralıkta boştadır (IDLE).
 *
 * @typedef {Object} GanttEntry
 * @property {string|null} processId
 * @property {number} start
 * @property {number} end
 *
 * ProcessResult → process'in girdileri + hesaplanan zamanları
 * @typedef {Object} ProcessResult
 * @property {string} id
 * @property {number} arrivalTime
 * @property {number} burstTime
 * @property {number} priority
 * @property {number} startTime       CPU'ya ilk girdiği an
 * @property {number} completionTime  işinin bittiği an
 * @property {number} turnaroundTime  completion − arrival
 * @property {number} waitingTime     turnaround − burst
 * @property {number} responseTime    start − arrival
 *
 * TraceEvent → adım adım oynatma için olay kaydı. queue: olaydan hemen sonraki hazır kuyruk (sırasıyla)
 * @typedef {Object} TraceEvent
 * @property {number} time
 * @property {'arrive'|'dispatch'|'preempt'|'complete'|'idle'} type
 * @property {string|null} processId
 * @property {string[]} queue
 *
 * SimulationResult → Engine.run() çıktısı
 * @typedef {Object} SimulationResult
 * @property {{id: string, name: string, shortName: string, preemptive: boolean}} algorithm
 * @property {Object} options          kullanılan parametreler (örn. { quantum: 2 })
 * @property {ProcessResult[]} processes  kullanıcının girdiği sırayla
 * @property {GanttEntry[]} timeline   zamana göre sıralı, IDLE dilimleri dahil
 * @property {TraceEvent[]} events      senaryo çok büyükse boş kalır (bkz. traceTruncated)
 * @property {boolean} traceTruncated  olay kaydı bellek sınırını aştığı için bırakıldı mı?
 * @property {Object} metrics          PerformanceMetrics (bkz. metrics-calculator.js)
 */
(function (CodeFlow) {
  'use strict';

  function isIdle(entry) {
    return entry.processId === null;
  }

  /** Zaman çizelgesini okunabilir metne çevirir: "P1 0-5 | IDLE 5-8 | P2 8-12" (testlerde ve raporda kullanılır) */
  function formatTimeline(timeline) {
    return timeline.map((e) => `${isIdle(e) ? 'IDLE' : e.processId} ${e.start}-${e.end}`).join(' | ');
  }

  function create({ algorithm, options, processes, timeline, events, traceTruncated = false, metrics }) {
    return {
      algorithm: {
        id: algorithm.id,
        name: algorithm.name,
        shortName: algorithm.shortName,
        preemptive: algorithm.preemptive,
      },
      options,
      processes,
      timeline,
      events,
      traceTruncated,
      metrics,
    };
  }

  CodeFlow.models.GanttEntry = { isIdle, formatTimeline };
  CodeFlow.models.SimulationResult = { create };
})(window.CodeFlow);
