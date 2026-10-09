describe('SJF — Shortest Job First (kesmesiz)', () => {
  const { run, dataset, gantt, column, events, proc } = T;

  it('Dataset A', () => {
    const r = run('sjf', dataset('A'));
    expect(gantt(r)).toBe('P1 0-5 | P2 5-8 | P4 8-12 | P3 12-20');
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 4, P3: 10, P4: 5 });
    expect(column(r, 'turnaroundTime')).toEqual({ P1: 5, P2: 7, P3: 18, P4: 9 });
    expect(r.metrics.avgWaitingTime).toBe(4.75);
    expect(r.metrics.avgTurnaroundTime).toBe(9.75);
    expect(r.metrics.avgResponseTime).toBe(4.75);
  });

  it('Dataset B: hepsi aynı anda gelince kısadan uzuna sıralar', () => {
    const r = run('sjf', dataset('B'));
    expect(gantt(r)).toBe('P3 0-2 | P2 2-6 | P4 6-12 | P1 12-20');
    expect(column(r, 'waitingTime')).toEqual({ P1: 12, P2: 2, P3: 0, P4: 6 });
    expect(r.metrics.avgWaitingTime).toBe(5);
    expect(r.metrics.avgTurnaroundTime).toBe(10);
  });

  it('Dataset D', () => {
    const r = run('sjf', dataset('D'));
    expect(gantt(r)).toBe('P1 0-8 | P3 8-11 | P2 11-16 | P4 16-22');
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 10, P3: 6, P4: 13 });
    expect(r.metrics.avgWaitingTime).toBe(7.25);
    expect(r.metrics.avgTurnaroundTime).toBe(12.75);
  });

  it('kesmesizdir: daha kısa iş gelse de çalışanı kesmez', () => {
    const r = run('sjf', [proc('P1', 0, 10), proc('P2', 1, 1)]);
    expect(gantt(r)).toBe('P1 0-10 | P2 10-11');
  });

  it('eşit burst: önce erken gelen seçilir', () => {
    const r = run('sjf', [proc('P1', 0, 4), proc('P2', 1, 3), proc('P3', 2, 3)]);
    expect(gantt(r)).toBe('P1 0-4 | P2 4-7 | P3 7-10');
  });

  it('eşit burst ve eşit geliş: girilen sıra korunur', () => {
    const r = run('sjf', [proc('B', 0, 3), proc('A', 0, 3)]);
    expect(gantt(r)).toBe('B 0-3 | A 3-6');
  });

  it('olay kaydı: hazır kuyruk burst süresine göre sıralı tutulur', () => {
    const r = run('sjf', dataset('A'));
    expect(events(r)).toEqual([
      '0 arrive P1 [P1]',
      '0 dispatch P1 []',
      '1 arrive P2 [P2]',
      '2 arrive P3 [P2,P3]',
      '3 arrive P4 [P2,P4,P3]',
      '5 complete P1 [P2,P4,P3]',
      '5 dispatch P2 [P4,P3]',
      '8 complete P2 [P4,P3]',
      '8 dispatch P4 [P3]',
      '12 complete P4 [P3]',
      '12 dispatch P3 []',
      '20 complete P3 []',
    ]);
  });
});
