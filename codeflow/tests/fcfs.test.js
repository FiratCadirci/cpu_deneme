describe('FCFS — First Come First Serve', () => {
  const { run, dataset, gantt, column, events, proc } = T;

  it('Dataset A: geliş sırasıyla çalıştırır', () => {
    const r = run('fcfs', dataset('A'));
    expect(gantt(r)).toBe('P1 0-5 | P2 5-8 | P3 8-16 | P4 16-20');
    expect(column(r, 'completionTime')).toEqual({ P1: 5, P2: 8, P3: 16, P4: 20 });
    expect(column(r, 'turnaroundTime')).toEqual({ P1: 5, P2: 7, P3: 14, P4: 17 });
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 4, P3: 6, P4: 13 });
    expect(column(r, 'responseTime')).toEqual({ P1: 0, P2: 4, P3: 6, P4: 13 });
    expect(r.metrics.avgWaitingTime).toBe(5.75);
    expect(r.metrics.avgTurnaroundTime).toBe(10.75);
    expect(r.metrics.avgResponseTime).toBe(5.75);
    expect(r.metrics.contextSwitches).toBe(3);
  });

  it('Dataset B: aynı anda gelenlerde girilen sırayı korur', () => {
    const r = run('fcfs', dataset('B'));
    expect(gantt(r)).toBe('P1 0-8 | P2 8-12 | P3 12-14 | P4 14-20');
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 8, P3: 12, P4: 14 });
    expect(r.metrics.avgWaitingTime).toBe(8.5);
    expect(r.metrics.avgTurnaroundTime).toBe(13.5);
  });

  it('Dataset C: CPU boşta kalınca IDLE dilimi ekler', () => {
    const r = run('fcfs', dataset('C'));
    expect(gantt(r)).toBe('P1 0-3 | IDLE 3-8 | P2 8-12 | IDLE 12-15 | P3 15-17');
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 0, P3: 0 });
    expect(r.metrics.idleTime).toBe(8);
  });

  it('Dataset D', () => {
    const r = run('fcfs', dataset('D'));
    expect(gantt(r)).toBe('P1 0-8 | P2 8-13 | P3 13-16 | P4 16-22');
    expect(column(r, 'waitingTime')).toEqual({ P1: 0, P2: 7, P3: 11, P4: 13 });
    expect(column(r, 'turnaroundTime')).toEqual({ P1: 8, P2: 12, P3: 14, P4: 19 });
    expect(r.metrics.avgWaitingTime).toBe(7.75);
    expect(r.metrics.avgTurnaroundTime).toBe(13.25);
  });

  it('girdi sırası karışık olsa da geliş zamanına göre çalıştırır', () => {
    const r = run('fcfs', [proc('P3', 4, 1), proc('P1', 0, 2), proc('P2', 2, 3)]);
    expect(gantt(r)).toBe('P1 0-2 | P2 2-5 | P3 5-6');
    // Sonuç tablosu kullanıcının girdiği sırayı korur
    expect(r.processes.map((p) => p.id)).toEqual(['P3', 'P1', 'P2']);
  });

  it('ilk process geç gelirse çizelge IDLE ile başlar', () => {
    const r = run('fcfs', [proc('P1', 3, 2)]);
    expect(gantt(r)).toBe('IDLE 0-3 | P1 3-5');
    expect(r.metrics.totalTime).toBe(5);
    expect(r.metrics.cpuUtilization).toBe(0.4);
  });

  it('kesmesizdir: uzun iş çalışırken gelen kısa iş bekler', () => {
    const r = run('fcfs', [proc('P1', 0, 10), proc('P2', 1, 1)]);
    expect(gantt(r)).toBe('P1 0-10 | P2 10-11');
  });

  it('olay kaydı: CPU boşta kaldığında idle olayı yazılır', () => {
    const r = run('fcfs', dataset('C'));
    expect(events(r)).toEqual([
      '0 arrive P1 [P1]',
      '0 dispatch P1 []',
      '3 complete P1 []',
      '3 idle []',
      '8 arrive P2 [P2]',
      '8 dispatch P2 []',
      '12 complete P2 []',
      '12 idle []',
      '15 arrive P3 [P3]',
      '15 dispatch P3 []',
      '17 complete P3 []',
    ]);
  });
});
