describe('Round Robin', () => {
  const { run, dataset, gantt, column, events, proc } = T;

  it('Dataset A, q=2', () => {
    const r = run('rr', dataset('A'), { quantum: 2 });
    expect(gantt(r)).toBe(
      'P1 0-2 | P2 2-4 | P3 4-6 | P1 6-8 | P4 8-10 | P2 10-11 | P3 11-13 | P1 13-14 | P4 14-16 | P3 16-20'
    );
    expect(column(r, 'completionTime')).toEqual({ P1: 14, P2: 11, P3: 20, P4: 16 });
    expect(column(r, 'waitingTime')).toEqual({ P1: 9, P2: 7, P3: 10, P4: 9 });
    expect(column(r, 'turnaroundTime')).toEqual({ P1: 14, P2: 10, P3: 18, P4: 13 });
    expect(column(r, 'responseTime')).toEqual({ P1: 0, P2: 1, P3: 2, P4: 5 });
    expect(r.metrics.avgWaitingTime).toBe(8.75);
    expect(r.metrics.avgTurnaroundTime).toBe(13.75);
    expect(r.metrics.avgResponseTime).toBe(2);
    expect(r.metrics.contextSwitches).toBe(9);
  });

  it('Dataset B, q=2', () => {
    const r = run('rr', dataset('B'), { quantum: 2 });
    expect(gantt(r)).toBe(
      'P1 0-2 | P2 2-4 | P3 4-6 | P4 6-8 | P1 8-10 | P2 10-12 | P4 12-14 | P1 14-16 | P4 16-18 | P1 18-20'
    );
    expect(column(r, 'waitingTime')).toEqual({ P1: 12, P2: 8, P3: 4, P4: 12 });
    expect(column(r, 'responseTime')).toEqual({ P1: 0, P2: 2, P3: 4, P4: 6 });
    expect(r.metrics.avgWaitingTime).toBe(9);
    expect(r.metrics.avgTurnaroundTime).toBe(14);
    expect(r.metrics.avgResponseTime).toBe(3);
  });

  it('Dataset C, q=2: kuyrukta tek kalan process kesintisiz görünür', () => {
    const r = run('rr', dataset('C'), { quantum: 2 });
    expect(gantt(r)).toBe('P1 0-3 | IDLE 3-8 | P2 8-12 | IDLE 12-15 | P3 15-17');
    expect(r.metrics.contextSwitches).toBe(2);
  });

  it('Dataset D, q=2', () => {
    const r = run('rr', dataset('D'), { quantum: 2 });
    expect(gantt(r)).toBe(
      'P1 0-2 | P2 2-4 | P3 4-6 | P1 6-8 | P4 8-10 | P2 10-12 | P3 12-13 | P1 13-15 | P4 15-17 | P2 17-18 | P1 18-20 | P4 20-22'
    );
    expect(column(r, 'completionTime')).toEqual({ P1: 20, P2: 18, P3: 13, P4: 22 });
    expect(column(r, 'waitingTime')).toEqual({ P1: 12, P2: 12, P3: 8, P4: 13 });
    expect(column(r, 'responseTime')).toEqual({ P1: 0, P2: 1, P3: 2, P4: 5 });
    expect(r.metrics.avgWaitingTime).toBe(11.25);
    expect(r.metrics.avgTurnaroundTime).toBe(16.75);
    expect(r.metrics.avgResponseTime).toBe(2);
    expect(r.metrics.contextSwitches).toBe(11);
  });

  it('quantum biterken gelen process, kesilen process\'ten önce kuyruğa girer', () => {
    const r = run('rr', [proc('P1', 0, 4), proc('P2', 2, 2)], { quantum: 2 });
    expect(gantt(r)).toBe('P1 0-2 | P2 2-4 | P1 4-6');
    expect(events(r)).toEqual([
      '0 arrive P1 [P1]',
      '0 dispatch P1 []',
      '2 arrive P2 [P2]',
      '2 preempt P1 [P2,P1]',
      '2 dispatch P2 [P1]',
      '4 complete P2 [P1]',
      '4 dispatch P1 []',
      '6 complete P1 []',
    ]);
  });

  it('q=1', () => {
    const r = run('rr', [proc('P1', 0, 3), proc('P2', 0, 2)], { quantum: 1 });
    expect(gantt(r)).toBe('P1 0-1 | P2 1-2 | P1 2-3 | P2 3-4 | P1 4-5');
    expect(column(r, 'waitingTime')).toEqual({ P1: 2, P2: 2 });
    expect(column(r, 'responseTime')).toEqual({ P1: 0, P2: 1 });
  });

  it('quantum en uzun işten büyükse FCFS ile aynı sonucu verir', () => {
    for (const id of ['A', 'B', 'C', 'D']) {
      expect(gantt(run('rr', dataset(id), { quantum: 100 }))).toBe(gantt(run('fcfs', dataset(id))));
    }
  });

  it('quantum verilmezse varsayılan 2 kullanılır', () => {
    expect(run('rr', dataset('A')).options).toEqual({ quantum: 2 });
    expect(run('rr', dataset('A'), { quantum: '' }).options).toEqual({ quantum: 2 });
  });

  it('quantum metin olarak gelirse ("3") sayıya çevrilir', () => {
    expect(run('rr', dataset('A'), { quantum: '3' }).options.quantum).toBe(3);
  });

  it('geçersiz quantum reddedilir', () => {
    const { ValidationError } = T.CF.errors;
    for (const quantum of [0, -1, 2.5, 'abc', 1001]) {
      expect(() => run('rr', dataset('A'), { quantum })).toThrow(ValidationError);
    }
  });
});
