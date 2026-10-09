/**
 * Algorithm Comparator — aynı process setini birden fazla algoritmayla çalıştırıp sonuçları yan yana koyar.
 *
 * Kullanıcıya tek bir "en iyi algoritma" dayatmaz: her metrikte en iyi değeri vereni ayrı ayrı işaretler.
 * Çünkü hangi algoritmanın iyi olduğu, neye önem verdiğinize (bekleme mi, yanıt süresi mi?) bağlıdır.
 */
(function (CodeFlow) {
  'use strict';

  /** Karşılaştırılan metrikler. better: 'lower' → küçük değer daha iyi. format: arayüzde nasıl gösterileceği */
  const METRICS = Object.freeze([
    { key: 'avgWaitingTime', label: 'Ort. Bekleme Süresi', short: 'Waiting', better: 'lower', format: 'decimal' },
    { key: 'avgTurnaroundTime', label: 'Ort. Tamamlanma Süresi', short: 'Turnaround', better: 'lower', format: 'decimal' },
    { key: 'avgResponseTime', label: 'Ort. Yanıt Süresi', short: 'Response', better: 'lower', format: 'decimal' },
    { key: 'cpuUtilization', label: 'CPU Kullanımı', short: 'CPU %', better: 'higher', format: 'percent' },
    { key: 'throughput', label: 'Throughput', short: 'Throughput', better: 'higher', format: 'decimal3' },
    { key: 'contextSwitches', label: 'Context Switch', short: 'Switch', better: 'lower', format: 'integer' },
  ]);

  const EPSILON = 1e-9;

  /**
   * @param {Array<Object>} processes
   * @param {Object} [options]            tüm algoritmalara verilir (örn. { quantum: 2 }); kullanmayan yok sayar
   * @param {string[]} [algorithmIds]     boşsa kayıtlı tüm algoritmalar
   * @returns {{results: SimulationResult[], best: Object<string, string[]>}}
   */
  function compare(processes, options = {}, algorithmIds) {
    const ids = algorithmIds && algorithmIds.length > 0 ? algorithmIds : CodeFlow.algorithms.list().map((a) => a.id);
    const results = ids.map((id) => CodeFlow.engine.SimulationEngine.run(id, processes, options));
    return { results, best: findBest(results) };
  }

  /** Her metrik için en iyi değeri veren algoritmaların id'leri (eşitlik varsa birden fazla) */
  function findBest(results) {
    const best = {};
    for (const metric of METRICS) {
      const values = results.map((r) => r.metrics[metric.key]);
      const target = metric.better === 'lower' ? Math.min(...values) : Math.max(...values);
      best[metric.key] = results.filter((_, i) => Math.abs(values[i] - target) < EPSILON).map((r) => r.algorithm.id);
    }
    return best;
  }

  /**
   * Bir parametreyi farklı değerlerle dener — Parametrik Senaryo Laboratuvarı.
   * Örn. sweep('rr', processes, 'quantum', [1, 2, 4, 8])
   * @returns {{value: number, result: SimulationResult}[]}
   */
  function sweep(algorithmId, processes, paramKey, values, baseOptions = {}) {
    return values.map((value) => ({
      value,
      result: CodeFlow.engine.SimulationEngine.run(algorithmId, processes, { ...baseOptions, [paramKey]: value }),
    }));
  }

  CodeFlow.comparison.AlgorithmComparator = { METRICS, compare, findBest, sweep };
})(window.CodeFlow);
