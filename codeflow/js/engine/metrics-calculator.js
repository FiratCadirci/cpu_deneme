/**
 * Metrics Calculator — performans metriklerini zaman çizelgesinden otomatik hesaplar.
 *
 * Hangi algoritmanın çalıştığını bilmez; sadece Gantt çizelgesine bakar. Bu yüzden
 * sonradan eklenen her algoritma metrikleri hiçbir ek kod yazmadan "bedavaya" alır.
 *
 *   Turnaround Time = Completion Time − Arrival Time   sisteme girişten bitişe kadar geçen süre
 *   Waiting Time    = Turnaround Time − Burst Time     hazır kuyrukta beklenen toplam süre
 *   Response Time   = İlk çalışma anı − Arrival Time   CPU'ya ilk kez dokunana kadar geçen süre
 *   CPU Utilization = CPU'nun dolu olduğu süre / toplam süre   (simülasyon saati 0'dan başlar)
 *   Throughput      = biten process sayısı / toplam süre
 *   Context Switch  = CPU'nun bir process'ten farklı bir process'e geçme sayısı (ilk yükleme sayılmaz)
 *
 * @typedef {Object} PerformanceMetrics
 * @property {number} avgWaitingTime
 * @property {number} avgTurnaroundTime
 * @property {number} avgResponseTime
 * @property {number} totalTime        son process'in bittiği an
 * @property {number} busyTime         CPU'nun çalıştığı toplam süre (= burst'lerin toplamı)
 * @property {number} idleTime         CPU'nun boşta kaldığı toplam süre
 * @property {number} cpuUtilization   0 ile 1 arası (arayüzde % olarak gösterilir)
 * @property {number} throughput       birim zamanda biten process sayısı
 * @property {number} contextSwitches
 * @property {number} processCount
 */
(function (CodeFlow) {
  'use strict';

  const average = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

  /**
   * @param {ReadonlyArray<Process>} processes
   * @param {GanttEntry[]} timeline  zamana göre sıralı (Engine.buildTimeline çıktısı)
   * @returns {{processes: ProcessResult[], summary: PerformanceMetrics}}
   */
  function calculate(processes, timeline) {
    const firstStart = new Map();
    const completion = new Map();
    let contextSwitches = 0;
    let lastRunning = null;

    for (const entry of timeline) {
      if (entry.processId === null) continue; // IDLE
      if (!firstStart.has(entry.processId)) firstStart.set(entry.processId, entry.start);
      completion.set(entry.processId, entry.end);
      if (lastRunning !== null && lastRunning !== entry.processId) contextSwitches += 1;
      lastRunning = entry.processId;
    }

    const results = processes.map((p) => {
      const startTime = firstStart.get(p.id);
      const completionTime = completion.get(p.id);
      const turnaroundTime = completionTime - p.arrivalTime;
      return {
        id: p.id,
        arrivalTime: p.arrivalTime,
        burstTime: p.burstTime,
        priority: p.priority,
        startTime,
        completionTime,
        turnaroundTime,
        waitingTime: turnaroundTime - p.burstTime,
        responseTime: startTime - p.arrivalTime,
      };
    });

    const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
    const busyTime = processes.reduce((sum, p) => sum + p.burstTime, 0);

    return {
      processes: results,
      summary: {
        avgWaitingTime: average(results.map((r) => r.waitingTime)),
        avgTurnaroundTime: average(results.map((r) => r.turnaroundTime)),
        avgResponseTime: average(results.map((r) => r.responseTime)),
        totalTime,
        busyTime,
        idleTime: totalTime - busyTime,
        cpuUtilization: totalTime > 0 ? busyTime / totalTime : 0,
        throughput: totalTime > 0 ? processes.length / totalTime : 0,
        contextSwitches,
        processCount: processes.length,
      },
    };
  }

  CodeFlow.engine.MetricsCalculator = { calculate };
})(window.CodeFlow);
