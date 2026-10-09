describe('Metrics Calculator', () => {
  const { run, dataset, gantt, proc } = T;
  const ALGORITHMS = ['fcfs', 'sjf', 'priority', 'rr'];

  it('TAT = CT − AT, WT = TAT − BT, RT = ilk başlama − AT', () => {
    for (const algorithmId of ALGORITHMS) {
      for (const p of run(algorithmId, dataset('A')).processes) {
        expect(p.turnaroundTime).toBe(p.completionTime - p.arrivalTime);
        expect(p.waitingTime).toBe(p.turnaroundTime - p.burstTime);
        expect(p.responseTime).toBe(p.startTime - p.arrivalTime);
      }
    }
  });

  it('Dataset C: CPU kullanımı = 9 / 17', () => {
    const m = run('fcfs', dataset('C')).metrics;
    expect(m.totalTime).toBe(17);
    expect(m.busyTime).toBe(9);
    expect(m.idleTime).toBe(8);
    expect(m.cpuUtilization).toBeCloseTo(9 / 17, 10);
    expect(m.throughput).toBeCloseTo(3 / 17, 10);
  });

  it('Dataset A: boşluk yoksa CPU kullanımı %100', () => {
    const m = run('fcfs', dataset('A')).metrics;
    expect(m.cpuUtilization).toBe(1);
    expect(m.throughput).toBe(0.2);
    expect(m.idleTime).toBe(0);
    expect(m.processCount).toBe(4);
  });

  it('tek process (plan Test 1): bekleme 0, turnaround = burst', () => {
    for (const algorithmId of ALGORITHMS) {
      const r = run(algorithmId, [proc('P1', 0, 5)]);
      expect(gantt(r)).toBe('P1 0-5');
      expect(r.processes[0].waitingTime).toBe(0);
      expect(r.processes[0].turnaroundTime).toBe(5);
      expect(r.processes[0].responseTime).toBe(0);
      expect(r.metrics.contextSwitches).toBe(0);
    }
  });

  it('CPU idle (plan Test 4): P1 AT0 BT5, P2 AT10 BT3', () => {
    const r = run('fcfs', [proc('P1', 0, 5), proc('P2', 10, 3)]);
    expect(gantt(r)).toBe('P1 0-5 | IDLE 5-10 | P2 10-13');
    expect(r.metrics.idleTime).toBe(5);
  });

  it('context switch: aynı process\'e dönüş sayılmaz, IDLE sonrası farklı process sayılır', () => {
    expect(run('rr', dataset('C'), { quantum: 1 }).metrics.contextSwitches).toBe(2);
    expect(run('rr', [proc('P1', 0, 6)], { quantum: 1 }).metrics.contextSwitches).toBe(0);
  });
});
