/**
 * Scheduling Algorithm — tüm zamanlama algoritmalarının ortak sözleşmesi ve kayıt defteri (registry)
 *
 * Tasarım fikri (Strategy deseni): Simulation Engine hangi algoritmayla çalıştığını bilmez,
 * sadece schedule() metodunu çağırır. Algoritmanın tek görevi "CPU'yu kim, ne zaman kullanır?"
 * sorusunu cevaplamaktır. Doğrulama, Gantt, metrikler ve karşılaştırma Engine'in işidir.
 *
 * Yeni bir algoritma eklemek (örn. SRTF, HRRN, MLFQ) mevcut kodu değiştirmeyi gerektirmez:
 *   1. js/algorithms/ altına yeni bir dosya aç
 *   2. SchedulingAlgorithm (veya NonPreemptiveAlgorithm) sınıfından türet
 *   3. CodeFlow.algorithms.register(new YeniAlgoritma()) ile kaydet
 *   4. index.html'e <script> olarak ekle → arayüzde, karşılaştırmada ve raporda otomatik görünür
 *
 * @typedef {Object} ScheduleSegment  CPU'nun bir process'i kesintisiz çalıştırdığı dilim
 * @property {string} processId
 * @property {number} start
 * @property {number} end
 */
(function (CodeFlow) {
  'use strict';

  /**
   * Adım adım oynatma için olay kaydedici. Algoritmalar önemli anlarda record() çağırır;
   * arayüz bu kayıtlardan "t anında hazır kuyrukta kimler, hangi sırayla var?" sorusunu cevaplar.
   */
  class ScheduleTrace {
    /**
     * @param {number} [budget]  en fazla kaç kuyruk kaydı saklanacağı. Çok büyük senaryolarda
     *                           (örn. 1000 process, quantum=1) bellek dolmasın diye bütçe aşılınca
     *                           kayıt tamamen bırakılır; simülasyon sonucu bundan etkilenmez.
     */
    constructor(budget = 500000) {
      this.events = [];
      this.budget = budget;
      this.overflowed = false;
    }

    /**
     * @param {number} time
     * @param {'arrive'|'dispatch'|'preempt'|'complete'|'idle'} type
     *        arrive: kuyruğa girdi · dispatch: CPU'ya alındı · preempt: kesildi, kuyruğa döndü
     *        complete: işi bitti · idle: CPU boşta kaldı
     * @param {string|null} processId
     * @param {ReadonlyArray<Process>} queue  olaydan hemen sonraki hazır kuyruk (sırasıyla)
     */
    record(time, type, processId, queue) {
      if (this.overflowed) return;
      this.budget -= queue.length + 1;
      if (this.budget < 0) {
        this.overflowed = true;
        this.events = [];
        return;
      }
      this.events.push({ time, type, processId, queue: queue.map((p) => p.id) });
    }
  }

  /** Algoritma doğrudan (Engine olmadan) çağrıldığında kullanılan, hiçbir şey kaydetmeyen trace */
  const NO_TRACE = Object.freeze({ record() {} });

  /** Geliş zamanına göre sıralama; aynı anda gelenlerde kullanıcının girdiği sıra korunur */
  function compareByArrival(a, b) {
    return a.arrivalTime - b.arrivalTime || a.index - b.index;
  }

  /** Soyut (abstract) temel sınıf: doğrudan kullanılmaz, türetilir. */
  class SchedulingAlgorithm {
    /**
     * @param {Object} info
     * @param {string} info.id            registry anahtarı (örn. 'fcfs')
     * @param {string} info.name          tam adı
     * @param {string} info.shortName     kısa adı (örn. 'FCFS')
     * @param {boolean} info.preemptive   çalışan process yarıda kesilebilir mi?
     * @param {string} info.description   tek cümlelik açıklama (arayüzde gösterilir)
     * @param {boolean} [info.usesPriority]  priority alanını kullanıyor mu?
     * @param {Array<{key: string, label: string, min: number, max: number, default: number}>} [info.params]
     *        kullanıcıdan alınacak ek parametreler (örn. Round Robin için quantum)
     */
    constructor(info) {
      if (new.target === SchedulingAlgorithm) {
        throw new TypeError('SchedulingAlgorithm soyut bir sınıftır; türetilerek kullanılmalı.');
      }
      this.id = info.id;
      this.name = info.name;
      this.shortName = info.shortName;
      this.preemptive = Boolean(info.preemptive);
      this.description = info.description || '';
      this.usesPriority = Boolean(info.usesPriority);
      this.params = Object.freeze(info.params || []);
    }

    /**
     * CPU'nun hangi process'i ne zaman çalıştıracağını hesaplar.
     * @param {ReadonlyArray<Process>} processes  doğrulanmış, değiştirilemez liste
     * @param {Object} options                    params'ta tanımlı değerler (doğrulanmış)
     * @param {ScheduleTrace} [trace]             adım adım oynatma için olay kaydedici
     * @returns {ScheduleSegment[]}
     */
    schedule(processes, options, trace) {
      throw new Error(`${this.shortName}: schedule() metodu yazılmamış.`);
    }
  }

  /**
   * Kesmesiz (non-preemptive) algoritmalar için ortak iskelet — Template Method deseni.
   *
   * Döngü her zaman aynıdır: CPU boşaldığında hazır kuyruğun en önündeki process'i al,
   * işi bitene kadar çalıştır. FCFS, SJF ve Priority yalnızca "kuyrukta kim öne geçer?"
   * kuralında ayrışır; bu yüzden alt sınıflar sadece compare() metodunu yazar.
   */
  class NonPreemptiveAlgorithm extends SchedulingAlgorithm {
    constructor(info) {
      super({ ...info, preemptive: false });
    }

    schedule(processes, options, trace = NO_TRACE) {
      const incoming = processes.slice().sort(compareByArrival); // henüz gelmemiş process'ler, geliş sırasıyla
      const readyQueue = [];
      const segments = [];
      let time = 0;
      let next = 0; // incoming dizisinde sıradaki gelecek process

      // limit anına kadar (dahil) gelenleri kuyruğa alır; kuyruk hep algoritmanın kuralına göre sıralı kalır
      const admitUntil = (limit) => {
        while (next < incoming.length && incoming[next].arrivalTime <= limit) {
          const process = incoming[next];
          next += 1;
          readyQueue.push(process);
          readyQueue.sort((a, b) => this.compare(a, b));
          trace.record(process.arrivalTime, 'arrive', process.id, readyQueue);
        }
      };

      while (segments.length < processes.length) {
        admitUntil(time);

        if (readyQueue.length === 0) {
          // Hazır process yok → CPU boşta (idle); saati bir sonraki gelişe ilerlet
          trace.record(time, 'idle', null, readyQueue);
          time = incoming[next].arrivalTime;
          continue;
        }

        const current = readyQueue.shift(); // kurala göre en öndeki process
        trace.record(time, 'dispatch', current.id, readyQueue);
        segments.push({ processId: current.id, start: time, end: time + current.burstTime });
        time += current.burstTime; // kesmesiz: CPU'yu işi bitene kadar bırakmaz

        admitUntil(time); // o çalışırken gelenler kuyrukta bekler
        trace.record(time, 'complete', current.id, readyQueue);
      }

      return segments;
    }

    /**
     * a, b'den önce seçilmeliyse negatif, sonra seçilmeliyse pozitif döner (Array.sort mantığı).
     * Sonuç her zaman aynı olsun diye eşitlikte en sonda a.index - b.index kullanılmalı.
     */
    compare(a, b) {
      throw new Error(`${this.shortName}: compare() metodu yazılmamış.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Registry: kayıtlı algoritmalar (eklenme sırasıyla)
  // ---------------------------------------------------------------------------
  const registry = new Map();

  function register(algorithm) {
    if (!(algorithm instanceof SchedulingAlgorithm)) {
      throw new TypeError('Kaydedilen nesne SchedulingAlgorithm sınıfından türemiş olmalı.');
    }
    if (!algorithm.id || !algorithm.shortName) {
      throw new TypeError('Algoritmanın id ve shortName alanları zorunlu.');
    }
    if (registry.has(algorithm.id)) {
      throw new Error(`"${algorithm.id}" kimlikli algoritma zaten kayıtlı.`);
    }
    registry.set(algorithm.id, algorithm);
    return algorithm;
  }

  function unregister(id) {
    return registry.delete(id);
  }

  function get(id) {
    const algorithm = registry.get(id);
    if (!algorithm) throw new Error(`Bilinmeyen algoritma: "${id}".`);
    return algorithm;
  }

  function has(id) {
    return registry.has(id);
  }

  function list() {
    return Array.from(registry.values());
  }

  Object.assign(CodeFlow.algorithms, {
    SchedulingAlgorithm,
    NonPreemptiveAlgorithm,
    ScheduleTrace,
    NO_TRACE,
    compareByArrival,
    register,
    unregister,
    get,
    has,
    list,
  });
})(window.CodeFlow);
