/**
 * Özellik (property) testleri: elle hesaplanmış birkaç örnek yerine, 300 rastgele senaryoda
 * her algoritmanın tanımındaki kuralların HER ZAMAN sağlandığını kontrol eder.
 * Senaryolar seed'li üretildiği için her çalıştırmada aynıdır; hata çıkarsa tekrar üretilebilir.
 */
describe('Özellik testleri — 300 rastgele senaryoda kurallar', () => {
  const { CF, run, gantt } = T;
  const { ScenarioGenerator } = CF.scenarios;
  const { stateAt } = CF.engine.SimulationEngine;
  const ALGORITHMS = ['fcfs', 'sjf', 'priority', 'rr'];

  const SCENARIOS = Array.from({ length: 300 }, (_, i) => {
    const random = ScenarioGenerator.createRandom(5000 + i);
    const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
    const settings = {
      seed: 1000 + i,
      count: pick(1, 12),
      maxArrival: pick(0, 30),
      minBurst: 1,
      maxBurst: pick(1, 12),
      minPriority: 0,
      maxPriority: pick(0, 5),
    };
    return { processes: ScenarioGenerator.generate(settings).processes, quantum: pick(1, 6), label: `seed=${settings.seed}` };
  });

  /** Her senaryo × her algoritma için body'yi çalıştırır; hata olursa hangi senaryoda olduğunu söyler */
  function forEachRun(algorithmIds, body) {
    for (const scenario of SCENARIOS) {
      for (const algorithmId of algorithmIds) {
        const result = run(algorithmId, scenario.processes, { quantum: scenario.quantum });
        try {
          body(result, scenario);
        } catch (error) {
          error.message = `[${algorithmId}, ${scenario.label}, q=${scenario.quantum}] ${error.message}`;
          throw error;
        }
      }
    }
  }

  /** Non-preemptive: p seçildiği anda kuyrukta bekleyen (gelmiş ama başlamamış) diğer process'ler */
  function waitingWhenStarted(result, p) {
    return result.processes.filter((q) => q.id !== p.id && q.arrivalTime <= p.startTime && q.startTime > p.startTime);
  }

  /** Sıralama anahtarlarını karşılaştırır: [1, 5] < [2, 0] */
  function lexLess(a, b) {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
  }

  it('tüm algoritmalar: metrik formülleri ve RT ≤ WT', () => {
    forEachRun(ALGORITHMS, (r) => {
      for (const p of r.processes) {
        expect(p.turnaroundTime).toBe(p.waitingTime + p.burstTime);
        expect(p.responseTime).toBeGreaterThanOrEqual(0);
        expect(p.responseTime).toBeLessThanOrEqual(p.waitingTime);
        expect(p.completionTime).toBeGreaterThanOrEqual(p.arrivalTime + p.burstTime);
      }
    });
  });

  it('tüm algoritmalar: kuyrukta iş varken CPU boşta kalmaz', () => {
    forEachRun(ALGORITHMS, (r) => {
      for (const idle of r.timeline.filter((e) => e.processId === null)) {
        for (const p of r.processes) {
          // Boşluk başladığında gelmiş herkes bitmiş olmalı; boşluk sırasında kimse gelmemeli
          if (p.arrivalTime <= idle.start) expect(p.completionTime).toBeLessThanOrEqual(idle.start);
          expect(p.arrivalTime > idle.start && p.arrivalTime < idle.end).toBe(false);
        }
        // Boşluk, birinin gelişiyle biter
        expect(r.processes.some((p) => p.arrivalTime === idle.end)).toBe(true);
      }
    });
  });

  it('tüm algoritmalar aynı toplam süreyi ve CPU kullanımını verir (hepsi iş-koruyucu)', () => {
    for (const scenario of SCENARIOS) {
      const totals = ALGORITHMS.map((id) => run(id, scenario.processes, { quantum: scenario.quantum }).metrics.totalTime);
      expect(new Set(totals).size).toBe(1);
    }
  });

  it('FCFS: process\'ler geliş sırasıyla (eşitlikte girilen sırayla) başlar', () => {
    forEachRun(['fcfs'], (r) => {
      const byStart = r.processes.slice().sort((a, b) => a.startTime - b.startTime).map((p) => p.id);
      const byArrival = r.processes
        .map((p, index) => ({ ...p, index }))
        .sort((a, b) => a.arrivalTime - b.arrivalTime || a.index - b.index)
        .map((p) => p.id);
      expect(byStart).toEqual(byArrival);
    });
  });

  it('SJF: seçilen process, o an bekleyenlerin en kısasıdır', () => {
    forEachRun(['sjf'], (r) => {
      const index = new Map(r.processes.map((p, i) => [p.id, i]));
      for (const p of r.processes) {
        for (const q of waitingWhenStarted(r, p)) {
          const chosen = [p.burstTime, p.arrivalTime, index.get(p.id)];
          const other = [q.burstTime, q.arrivalTime, index.get(q.id)];
          expect(lexLess(chosen, other)).toBe(true);
        }
      }
    });
  });

  it('Priority: seçilen process, o an bekleyenlerin en önceliklisidir', () => {
    forEachRun(['priority'], (r) => {
      const index = new Map(r.processes.map((p, i) => [p.id, i]));
      for (const p of r.processes) {
        for (const q of waitingWhenStarted(r, p)) {
          const chosen = [p.priority, p.arrivalTime, index.get(p.id)];
          const other = [q.priority, q.arrivalTime, index.get(q.id)];
          expect(lexLess(chosen, other)).toBe(true);
        }
      }
    });
  });

  it('Round Robin: hiçbir dilim quantum\'dan uzun değildir', () => {
    const rr = CF.algorithms.get('rr');
    for (const scenario of SCENARIOS) {
      const prepared = CF.engine.ProcessManager.prepare(scenario.processes);
      for (const segment of rr.schedule(prepared, { quantum: scenario.quantum })) {
        expect(segment.end - segment.start).toBeLessThanOrEqual(scenario.quantum);
      }
    }
  });

  it('Round Robin: quantum ≥ en uzun burst ise FCFS ile aynıdır', () => {
    for (const scenario of SCENARIOS) {
      const longest = Math.max(...scenario.processes.map((p) => p.burstTime));
      expect(gantt(run('rr', scenario.processes, { quantum: longest }))).toBe(gantt(run('fcfs', scenario.processes)));
    }
  });

  it('herkes aynı anda gelirse SJF ortalama beklemede hiçbir algoritmadan kötü değildir', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const { processes } = ScenarioGenerator.generate({ seed, count: 2 + (seed % 9), maxArrival: 0 });
      const sjf = run('sjf', processes).metrics.avgWaitingTime;
      for (const id of ['fcfs', 'priority', 'rr']) {
        expect(sjf).toBeLessThanOrEqual(run(id, processes, { quantum: 1 + (seed % 4) }).metrics.avgWaitingTime);
      }
    }
  });

  it('olay kaydı: zaman sırasıyla, her process bir kez gelir ve bir kez biter', () => {
    forEachRun(ALGORITHMS, (r) => {
      for (let i = 1; i < r.events.length; i += 1) {
        expect(r.events[i].time).toBeGreaterThanOrEqual(r.events[i - 1].time);
      }
      expect(r.events.filter((e) => e.type === 'arrive').length).toBe(r.processes.length);
      expect(r.events.filter((e) => e.type === 'complete').length).toBe(r.processes.length);
      expect(r.events[r.events.length - 1].queue).toEqual([]);
    });
  });

  it('stateAt: her an için kuyruk, "gelmiş + bitmemiş + çalışmayan" kümesiyle aynıdır', () => {
    forEachRun(ALGORITHMS, (r) => {
      for (let t = 0; t <= r.metrics.totalTime; t += 1) {
        const s = stateAt(r, t);
        const expected = r.processes
          .filter((p) => p.arrivalTime <= t && p.completionTime > t && p.id !== s.running)
          .map((p) => p.id)
          .sort();
        expect(s.ready.slice().sort()).toEqual(expected);
        const entry = r.timeline.find((e) => e.start <= t && t < e.end);
        expect(s.running).toBe(entry ? entry.processId : null);
      }
    });
  });

  it('performans (plan Test 7): 1000 process tüm algoritmalarla 5 saniyenin altında', () => {
    const { processes } = ScenarioGenerator.generate({ seed: 2024, count: 1000, maxArrival: 5000, maxBurst: 100 });
    const started = performance.now();
    for (const id of ALGORITHMS) {
      const r = run(id, processes, { quantum: 1 });
      expect(r.processes.length).toBe(1000);
    }
    expect(performance.now() - started).toBeLessThanOrEqual(5000);
  });

  it('çok büyük senaryoda olay kaydı bırakılır ama sonuç ve stateAt doğru kalır', () => {
    const { processes } = ScenarioGenerator.generate({ seed: 99, count: 1000, maxArrival: 10, maxBurst: 50 });
    const r = run('rr', processes, { quantum: 1 });
    expect(r.traceTruncated).toBe(true);
    expect(r.events).toEqual([]);
    const t = Math.floor(r.metrics.totalTime / 2);
    const s = stateAt(r, t);
    const expected = r.processes.filter((p) => p.arrivalTime <= t && p.completionTime > t && p.id !== s.running).length;
    expect(s.ready.length).toBe(expected);
  });
});
