/**
 * Simulation Engine — simülasyonun orkestra şefi
 *
 *   ham process listesi
 *     → ProcessManager.prepare()   girdi doğrulama
 *     → algorithm.schedule()       "kim, ne zaman çalışır?" (Strategy)
 *     → verifySchedule()           plan fiziksel olarak mümkün mü? (güvenlik ağı)
 *     → buildTimeline()            Gantt: bitişik dilimleri birleştir, IDLE boşluklarını ekle
 *     → MetricsCalculator          waiting, turnaround, response, CPU kullanımı...
 *     → SimulationResult
 */
(function (CodeFlow) {
  'use strict';

  const { ValidationError, ScheduleError } = CodeFlow.errors;
  const { isBlank } = CodeFlow.utils;

  /** Algoritmanın params tanımına göre seçenekleri doğrular, boş olanlara varsayılanı yazar. */
  function resolveOptions(algorithm, options = {}) {
    const resolved = {};
    const errors = [];
    for (const param of algorithm.params) {
      const raw = options[param.key];
      const value = isBlank(raw) ? param.default : Number(raw);
      if (!Number.isInteger(value) || value < param.min || value > param.max) {
        errors.push({
          index: null,
          field: param.key,
          message: `${param.label} ${param.min} ile ${param.max} arasında bir tam sayı olmalı.`,
        });
      }
      resolved[param.key] = value;
    }
    if (errors.length > 0) throw new ValidationError(errors);
    return Object.freeze(resolved);
  }

  /**
   * Algoritmanın ürettiği planın kurallara uyduğunu kontrol eder. Yeni eklenen bir algoritmada
   * hata varsa yanlış sonuç göstermek yerine ne yanlış gittiğini söyleyen bir hata fırlatır.
   */
  function verifySchedule(algorithm, processes, segments) {
    const fail = (message) => {
      throw new ScheduleError(`${algorithm.shortName}: ${message}`);
    };
    if (!Array.isArray(segments)) fail('schedule() bir dizi döndürmeli.');
    if (segments.some((s) => !s || typeof s !== 'object')) {
      fail('schedule() sadece { processId, start, end } nesneleri döndürmeli.');
    }

    const byId = new Map(processes.map((p) => [p.id, p]));
    const executed = new Map(processes.map((p) => [p.id, 0]));
    const ordered = segments.slice().sort((a, b) => a.start - b.start);
    let cpuFreeAt = 0;

    for (const segment of ordered) {
      const process = byId.get(segment.processId);
      if (!process) fail(`Bilinmeyen process: "${segment.processId}".`);
      const { start, end } = segment;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
        fail(`${process.id} için geçersiz zaman dilimi [${start}, ${end}].`);
      }
      if (start < process.arrivalTime) {
        fail(`${process.id} daha gelmeden (t=${process.arrivalTime}) t=${start} anında çalıştırılmış.`);
      }
      if (start < cpuFreeAt) fail(`t=${start} anında CPU'da iki process var (çakışma).`);
      cpuFreeAt = end;
      executed.set(process.id, executed.get(process.id) + (end - start));
    }

    for (const process of processes) {
      const total = executed.get(process.id);
      if (total !== process.burstTime) {
        fail(`${process.id} toplam ${total} birim çalışmış; Burst Time ${process.burstTime} olmalıydı.`);
      }
    }
  }

  /** Kesmesiz bir algoritmada her process tek parça çalışmalı. */
  function verifyNotSplit(algorithm, processes, timeline) {
    const pieces = new Map(processes.map((p) => [p.id, 0]));
    for (const entry of timeline) {
      if (entry.processId !== null) pieces.set(entry.processId, pieces.get(entry.processId) + 1);
    }
    for (const [id, count] of pieces) {
      if (count !== 1) {
        throw new ScheduleError(`${algorithm.shortName}: kesmesiz bir algoritmada ${id} ${count} parçaya bölünmüş.`);
      }
    }
  }

  /**
   * Dilimlerden Gantt çizelgesi kurar: zamana göre sıralar, aynı process'in art arda gelen
   * dilimlerini birleştirir ve CPU'nun boş kaldığı aralıklara IDLE ekler. Saat 0'dan başlar.
   * @returns {GanttEntry[]}
   */
  function buildTimeline(segments) {
    const ordered = segments.slice().sort((a, b) => a.start - b.start);
    const timeline = [];
    let cursor = 0;

    for (const { processId, start, end } of ordered) {
      if (start > cursor) timeline.push({ processId: null, start: cursor, end: start });
      const last = timeline[timeline.length - 1];
      if (last && last.processId === processId && last.end === start) {
        last.end = end;
      } else {
        timeline.push({ processId, start, end });
      }
      cursor = end;
    }
    return timeline;
  }

  /**
   * Tek bir algoritmayla simülasyon çalıştırır.
   * @param {string} algorithmId                 'fcfs' | 'sjf' | 'priority' | 'rr' | (sonradan eklenenler)
   * @param {Array<Object>} processes            [{ id, arrivalTime, burstTime, priority }]
   * @param {Object} [options]                   örn. { quantum: 2 } — algoritma kullanmıyorsa yok sayılır
   * @returns {SimulationResult}
   * @throws {ValidationError}  girdi veya parametre hatalıysa
   * @throws {ScheduleError}    algoritma imkânsız bir plan ürettiyse
   */
  function run(algorithmId, processes, options) {
    const algorithm = CodeFlow.algorithms.get(algorithmId);
    const prepared = CodeFlow.engine.ProcessManager.prepare(processes);
    const resolvedOptions = resolveOptions(algorithm, options);
    const trace = new CodeFlow.algorithms.ScheduleTrace();

    const segments = algorithm.schedule(prepared, resolvedOptions, trace);
    verifySchedule(algorithm, prepared, segments);
    const timeline = buildTimeline(segments);
    if (!algorithm.preemptive) verifyNotSplit(algorithm, prepared, timeline);

    const { processes: processResults, summary } = CodeFlow.engine.MetricsCalculator.calculate(prepared, timeline);

    return CodeFlow.models.SimulationResult.create({
      algorithm,
      options: resolvedOptions,
      processes: processResults,
      timeline,
      events: trace.events,
      traceTruncated: trace.overflowed,
      metrics: summary,
    });
  }

  /**
   * Adım adım oynatma için t anındaki durumu çıkarır.
   * @returns {{time: number, running: string|null, ready: string[], finished: string[],
   *            notArrived: string[], states: Object<string, 'new'|'ready'|'running'|'terminated'>}}
   */
  function stateAt(result, time) {
    const current = result.timeline.find((e) => e.start <= time && time < e.end);
    const running = current && current.processId !== null ? current.processId : null;
    const finished = result.processes.filter((p) => p.completionTime <= time).map((p) => p.id);
    const notArrived = result.processes.filter((p) => p.arrivalTime > time).map((p) => p.id);

    let ready;
    if (result.events.length > 0) {
      // Algoritmanın kaydettiği gerçek kuyruk sırası (t anındaki son olaydan sonraki hâli)
      let last = null;
      for (const event of result.events) {
        if (event.time > time) break;
        last = event;
      }
      ready = last ? last.queue.filter((id) => id !== running) : [];
    } else {
      // Olay kaydı tutmayan algoritmalar için: gelmiş, bitmemiş ve çalışmayanlar (geliş sırasıyla)
      ready = result.processes
        .filter((p) => p.arrivalTime <= time && p.completionTime > time && p.id !== running)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .map((p) => p.id);
    }

    const states = {};
    for (const p of result.processes) {
      if (p.completionTime <= time) states[p.id] = 'terminated';
      else if (p.id === running) states[p.id] = 'running';
      else if (p.arrivalTime <= time) states[p.id] = 'ready';
      else states[p.id] = 'new';
    }

    return { time, running, ready, finished, notArrived, states };
  }

  CodeFlow.engine.SimulationEngine = { run, stateAt, buildTimeline, verifySchedule, resolveOptions };
})(window.CodeFlow);
