/**
 * Round Robin (RR) — Sıralı Zaman Dilimi
 *
 * Kural: Hazır kuyruk düz bir sıradır (FIFO). Kuyruğun başındaki process en fazla
 * "quantum" kadar çalışır. İşi bitmezse kesilir (preemption) ve kuyruğun sonuna geçer.
 *
 * Eşitlik kuralı: Bir dilim biterken (aynı anda) gelen process'ler, kesilen process'ten
 * ÖNCE kuyruğa girer. Ders kitaplarında en yaygın kabul budur.
 * Kuyrukta başka kimse yoksa kesilen process hemen tekrar çalışır; bu bir context switch sayılmaz.
 *
 * Artı: Herkes CPU'ya çabuk dokunur → yanıt süresi (response time) çok iyidir.
 * Eksi: Sık kesme yüzünden toplam bekleme süresi artabilir. Quantum çok küçükse context switch
 *       maliyeti artar, çok büyükse RR, FCFS'e dönüşür.
 */
(function (CodeFlow) {
  'use strict';

  const { SchedulingAlgorithm, NO_TRACE, compareByArrival } = CodeFlow.algorithms;

  class RoundRobin extends SchedulingAlgorithm {
    constructor() {
      super({
        id: 'rr',
        name: 'Round Robin',
        shortName: 'RR',
        preemptive: true,
        description: 'Herkes sırayla en fazla quantum kadar çalışır; işi bitmeyen kuyruğun sonuna geçer.',
        params: [{ key: 'quantum', label: 'Time Quantum', min: 1, max: 1000, default: 2 }],
      });
    }

    schedule(processes, options, trace = NO_TRACE) {
      const { quantum } = options;
      const incoming = processes.slice().sort(compareByArrival);
      const remaining = new Map(processes.map((p) => [p.id, p.burstTime])); // kalan çalışma süreleri
      const readyQueue = [];
      const segments = [];
      let time = 0;
      let next = 0;
      let finished = 0;

      // limit anına kadar (dahil) gelenleri kuyruğun sonuna ekler
      const admitUntil = (limit) => {
        while (next < incoming.length && incoming[next].arrivalTime <= limit) {
          const process = incoming[next];
          next += 1;
          readyQueue.push(process);
          trace.record(process.arrivalTime, 'arrive', process.id, readyQueue);
        }
      };

      while (finished < processes.length) {
        admitUntil(time);

        if (readyQueue.length === 0) {
          trace.record(time, 'idle', null, readyQueue);
          time = incoming[next].arrivalTime; // CPU boşta → sıradaki gelişe atla
          continue;
        }

        const current = readyQueue.shift();
        trace.record(time, 'dispatch', current.id, readyQueue);

        const slice = Math.min(quantum, remaining.get(current.id));
        segments.push({ processId: current.id, start: time, end: time + slice });
        time += slice;
        remaining.set(current.id, remaining.get(current.id) - slice);

        admitUntil(time); // dilim sırasında (ve tam bitiminde) gelenler, kesilen process'ten ÖNCE girer

        if (remaining.get(current.id) > 0) {
          readyQueue.push(current); // quantum doldu → kuyruğun sonuna
          trace.record(time, 'preempt', current.id, readyQueue);
        } else {
          finished += 1;
          trace.record(time, 'complete', current.id, readyQueue);
        }
      }

      return segments;
    }
  }

  CodeFlow.algorithms.RoundRobin = RoundRobin;
  CodeFlow.algorithms.register(new RoundRobin());
})(window.CodeFlow);
