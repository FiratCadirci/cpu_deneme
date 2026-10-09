describe('Priority Scheduling (kesmesiz, küçük sayı = yüksek öncelik)', () => {
  const { run, dataset, gantt, column, proc } = T;

  it('Dataset A', () => {
    const r = run('priority', dataset('A'));
    expect(gantt(r)).toBe('P1 0-5 | P2 5-8 | P4 8-12 | P3 12-20');
    expect(r.metrics.avgWaitingTime).toBe(4.75);
    expect(r.metrics.avgTurnaroundTime).toBe(9.75);
  });

  it('Dataset B: eşit öncelikte önce girilen seçilir (P1, P4\'ten önce)', () => {
    const r = run('priority', dataset('B'));
    expect(gantt(r)).toBe('P2 0-4 | P1 4-12 | P4 12-18 | P3 18-20');
    expect(column(r, 'waitingTime')).toEqual({ P1: 4, P2: 0, P3: 18, P4: 12 });
    expect(r.metrics.avgWaitingTime).toBe(8.5);
    expect(r.metrics.avgTurnaroundTime).toBe(13.5);
  });

  it('Dataset D: hepsinin önceliği aynıysa FCFS gibi davranır', () => {
    expect(gantt(run('priority', dataset('D')))).toBe(gantt(run('fcfs', dataset('D'))));
  });

  it('küçük sayı daha önceliklidir', () => {
    const r = run('priority', [proc('P1', 0, 2, 5), proc('P2', 0, 2, 1)]);
    expect(gantt(r)).toBe('P2 0-2 | P1 2-4');
  });

  it('0 en yüksek önceliktir', () => {
    const r = run('priority', [proc('P1', 0, 2, 1), proc('P2', 0, 2, 0)]);
    expect(gantt(r)).toBe('P2 0-2 | P1 2-4');
  });

  it('eşit öncelikte önce erken gelen seçilir (plan Test 5)', () => {
    const r = run('priority', [proc('P1', 0, 4, 1), proc('P2', 1, 2, 3), proc('P3', 2, 2, 3)]);
    expect(gantt(r)).toBe('P1 0-4 | P2 4-6 | P3 6-8');
  });

  it('kesmesizdir: daha öncelikli iş gelse de çalışanı kesmez', () => {
    const r = run('priority', [proc('P1', 0, 5, 3), proc('P2', 1, 2, 1)]);
    expect(gantt(r)).toBe('P1 0-5 | P2 5-7');
  });

  it('priority boş bırakılırsa varsayılan 1 kullanılır', () => {
    const r = run('priority', [
      { id: 'P1', arrivalTime: 0, burstTime: 2, priority: '' },
      { id: 'P2', arrivalTime: 0, burstTime: 2, priority: 0 },
    ]);
    expect(column(r, 'priority')).toEqual({ P1: 1, P2: 0 });
    expect(gantt(r)).toBe('P2 0-2 | P1 2-4');
  });
});
