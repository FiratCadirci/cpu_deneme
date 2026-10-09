/**
 * Hazır test veri setleri (proje planındaki Dataset A–D)
 *
 * Tüm ekip aynı verilerle test etsin, sunumda da aynı örnekler gösterilsin diye tek yerde tutulur.
 * get() her çağrıda kopya döndürür; arayüzde yapılan düzenlemeler buradaki orijinali bozmaz.
 */
(function (CodeFlow) {
  'use strict';

  const p = (id, arrivalTime, burstTime, priority = 1) => ({ id, arrivalTime, burstTime, priority });

  const DATASETS = [
    {
      id: 'A',
      name: 'Dataset A — Temel',
      description: 'Farklı anlarda gelen 4 process. Algoritmalar arasındaki farkı görmek için en iyi başlangıç.',
      quantum: 2,
      processes: [p('P1', 0, 5, 2), p('P2', 1, 3, 1), p('P3', 2, 8, 3), p('P4', 3, 4, 2)],
    },
    {
      id: 'B',
      name: 'Dataset B — Aynı anda geliş',
      description: 'Hepsi t=0\'da gelir. SJF\'nin ortalama bekleme süresini nasıl düşürdüğü net görülür.',
      quantum: 2,
      processes: [p('P1', 0, 8, 2), p('P2', 0, 4, 1), p('P3', 0, 2, 3), p('P4', 0, 6, 2)],
    },
    {
      id: 'C',
      name: 'Dataset C — CPU boşta kalıyor',
      description: 'Process\'ler arasında boşluk var. Gantt\'ta IDLE dilimleri ve CPU kullanımındaki düşüş görülür.',
      quantum: 2,
      processes: [p('P1', 0, 3, 1), p('P2', 8, 4, 2), p('P3', 15, 2, 3)],
    },
    {
      id: 'D',
      name: 'Dataset D — Round Robin',
      description: 'Uzun burst süreleri. Quantum\'u değiştirerek Round Robin\'in davranışını inceleyin.',
      quantum: 2,
      processes: [p('P1', 0, 8), p('P2', 1, 5), p('P3', 2, 3), p('P4', 3, 6)],
    },
  ];

  function copy(dataset) {
    return { ...dataset, processes: dataset.processes.map((process) => ({ ...process })) };
  }

  function list() {
    return DATASETS.map(copy);
  }

  function get(id) {
    const dataset = DATASETS.find((d) => d.id === id);
    if (!dataset) throw new Error(`Bilinmeyen veri seti: "${id}".`);
    return copy(dataset);
  }

  CodeFlow.scenarios.Datasets = { list, get };
})(window.CodeFlow);
