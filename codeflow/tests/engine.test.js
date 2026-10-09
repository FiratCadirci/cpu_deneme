describe('Simulation Engine, Registry ve Comparator', () => {
  const { CF, run, dataset, gantt, proc } = T;
  const { ScheduleError } = CF.errors;
  const { SchedulingAlgorithm, NonPreemptiveAlgorithm } = CF.algorithms;
  const { AlgorithmComparator } = CF.comparison;
  const { stateAt } = CF.engine.SimulationEngine;

  /** Test için geçici bir algoritma kaydeder, iş bitince siler */
  function withAlgorithm(algorithm, body) {
    CF.algorithms.register(algorithm);
    try {
      body();
    } finally {
      CF.algorithms.unregister(algorithm.id);
    }
  }

  /** schedule() sonucunu dışarıdan veren sahte algoritma — güvenlik ağını denemek için */
  class FakeAlgorithm extends SchedulingAlgorithm {
    constructor(id, segments, preemptive = true) {
      super({ id, name: id, shortName: id.toUpperCase(), preemptive });
      this.segments = segments;
    }

    schedule() {
      return this.segments;
    }
  }

  it('4 algoritma kayıtlı (eklenme sırasıyla)', () => {
    expect(CF.algorithms.list().map((a) => a.id)).toEqual(['fcfs', 'sjf', 'priority', 'rr']);
  });

  it('bilinmeyen algoritma hata verir', () => {
    expect(() => run('yok', dataset('A'))).toThrow('Bilinmeyen algoritma');
  });

  it('SchedulingAlgorithm doğrudan oluşturulamaz (abstract)', () => {
    expect(() => new SchedulingAlgorithm({ id: 'x', shortName: 'X' })).toThrow(TypeError);
  });

  it('aynı id ile ikinci kayıt reddedilir', () => {
    expect(() => CF.algorithms.register(new CF.algorithms.FCFS())).toThrow('zaten kayıtlı');
  });

  it('SchedulingAlgorithm\'dan türemeyen nesne kaydedilemez', () => {
    expect(() => CF.algorithms.register({ id: 'x', shortName: 'X', schedule: () => [] })).toThrow(TypeError);
  });

  it('genişletilebilirlik: sadece compare() yazılan yeni algoritma her yerde çalışır', () => {
    // LJF (Longest Job First): en uzun iş önce — SJF'nin tersi
    class LJF extends NonPreemptiveAlgorithm {
      constructor() {
        super({ id: 'test-ljf', name: 'Longest Job First', shortName: 'LJF' });
      }

      compare(a, b) {
        return b.burstTime - a.burstTime || CF.algorithms.compareByArrival(a, b);
      }
    }

    withAlgorithm(new LJF(), () => {
      expect(gantt(run('test-ljf', dataset('B')))).toBe('P1 0-8 | P4 8-14 | P2 14-18 | P3 18-20');
      const ids = AlgorithmComparator.compare(dataset('B')).results.map((r) => r.algorithm.id);
      expect(ids).toContain('test-ljf');
    });
    expect(CF.algorithms.has('test-ljf')).toBe(false);
  });

  const BAD_SCHEDULES = [
    {
      name: 'process gelmeden çalıştırılırsa',
      processes: [proc('P1', 3, 5)],
      segments: [{ processId: 'P1', start: 0, end: 5 }],
      message: 'gelmeden',
    },
    {
      name: 'iki process aynı anda CPU\'daysa',
      processes: [proc('P1', 0, 2), proc('P2', 0, 2)],
      segments: [
        { processId: 'P1', start: 0, end: 2 },
        { processId: 'P2', start: 1, end: 3 },
      ],
      message: 'çakışma',
    },
    {
      name: 'process burst süresi kadar çalışmazsa',
      processes: [proc('P1', 0, 2)],
      segments: [{ processId: 'P1', start: 0, end: 1 }],
      message: 'Burst Time',
    },
    {
      name: 'bilinmeyen process çalıştırılırsa',
      processes: [proc('P1', 0, 2)],
      segments: [{ processId: 'X', start: 0, end: 2 }],
      message: 'Bilinmeyen process',
    },
    {
      name: 'boş/ters zaman dilimi varsa',
      processes: [proc('P1', 0, 2)],
      segments: [{ processId: 'P1', start: 2, end: 2 }],
      message: 'geçersiz zaman dilimi',
    },
    {
      name: 'dizi dönmezse',
      processes: [proc('P1', 0, 2)],
      segments: null,
      message: 'dizi',
    },
    {
      name: 'dizide nesne olmayan eleman varsa',
      processes: [proc('P1', 0, 2)],
      segments: [null],
      message: 'nesneleri',
    },
  ];

  for (const bad of BAD_SCHEDULES) {
    it(`güvenlik ağı: ${bad.name} → ScheduleError`, () => {
      withAlgorithm(new FakeAlgorithm('test-bad', bad.segments), () => {
        const error = expect(() => run('test-bad', bad.processes)).toThrow(ScheduleError);
        expect(error.message).toContain(bad.message);
      });
    });
  }

  it('güvenlik ağı: kesmesiz algoritma process\'i bölerse → ScheduleError', () => {
    const segments = [
      { processId: 'P1', start: 0, end: 1 },
      { processId: 'P2', start: 1, end: 2 },
      { processId: 'P1', start: 2, end: 3 },
    ];
    withAlgorithm(new FakeAlgorithm('test-split', segments, false), () => {
      const error = expect(() => run('test-split', [proc('P1', 0, 2), proc('P2', 0, 1)])).toThrow(ScheduleError);
      expect(error.message).toContain('bölünmüş');
    });
  });

  it('girdi listesi değiştirilmez', () => {
    const input = dataset('A');
    const before = JSON.stringify(input);
    run('rr', input, { quantum: 2 });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('stateAt: RR\'da t=2 anında kuyruk sırası', () => {
    const r = run('rr', dataset('A'), { quantum: 2 });
    const s = stateAt(r, 2);
    expect(s.running).toBe('P2');
    expect(s.ready).toEqual(['P3', 'P1']);
    expect(s.notArrived).toEqual(['P4']);
    expect(s.finished).toEqual([]);
    expect(s.states).toEqual({ P1: 'ready', P2: 'running', P3: 'ready', P4: 'new' });
  });

  it('stateAt: RR\'da t=9 ve bitişte', () => {
    const r = run('rr', dataset('A'), { quantum: 2 });
    const middle = stateAt(r, 9);
    expect(middle.running).toBe('P4');
    expect(middle.ready).toEqual(['P2', 'P3', 'P1']);
    const end = stateAt(r, 20);
    expect(end.running).toBe(null);
    expect(end.ready).toEqual([]);
    expect(end.finished).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('stateAt: IDLE sırasında CPU boştur', () => {
    const s = stateAt(run('fcfs', dataset('C')), 5);
    expect(s.running).toBe(null);
    expect(s.ready).toEqual([]);
    expect(s.states).toEqual({ P1: 'terminated', P2: 'new', P3: 'new' });
  });

  it('compare: her metrikte en iyiyi ayrı ayrı işaretler (Dataset A)', () => {
    const { results, best } = AlgorithmComparator.compare(dataset('A'), { quantum: 2 });
    expect(results.map((r) => r.algorithm.id)).toEqual(['fcfs', 'sjf', 'priority', 'rr']);
    expect(best.avgWaitingTime).toEqual(['sjf', 'priority']);
    expect(best.avgTurnaroundTime).toEqual(['sjf', 'priority']);
    expect(best.avgResponseTime).toEqual(['rr']);
    expect(best.cpuUtilization).toEqual(['fcfs', 'sjf', 'priority', 'rr']);
    expect(best.contextSwitches).toEqual(['fcfs', 'sjf', 'priority']);
  });

  it('compare: sadece seçilen algoritmalar çalıştırılabilir', () => {
    const { results } = AlgorithmComparator.compare(dataset('A'), {}, ['rr', 'fcfs']);
    expect(results.map((r) => r.algorithm.id)).toEqual(['rr', 'fcfs']);
  });

  it('sweep: Dataset D üzerinde quantum 1, 2, 4, 8 (plan Test 6)', () => {
    const rows = AlgorithmComparator.sweep('rr', dataset('D'), 'quantum', [1, 2, 4, 8]);
    expect(rows.map((row) => row.value)).toEqual([1, 2, 4, 8]);
    expect(rows.map((row) => row.result.options.quantum)).toEqual([1, 2, 4, 8]);
    expect(rows[1].result.metrics.avgWaitingTime).toBe(11.25);
    // q=8 en uzun işe (8) eşit → Round Robin, FCFS'e dönüşür
    expect(gantt(rows[3].result)).toBe(gantt(run('fcfs', dataset('D'))));
  });
});
