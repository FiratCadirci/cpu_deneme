describe('Senaryolar — hazır veri setleri ve rastgele üretici', () => {
  const { CF } = T;
  const { Datasets, ScenarioGenerator } = CF.scenarios;
  const { ValidationError } = CF.errors;

  it('Dataset A–D tanımlı ve hepsi geçerli', () => {
    expect(Datasets.list().map((d) => d.id)).toEqual(['A', 'B', 'C', 'D']);
    for (const d of Datasets.list()) {
      expect(CF.engine.ProcessManager.validate(d.processes)).toEqual([]);
    }
  });

  it('get() kopya döndürür; düzenlemek orijinali bozmaz', () => {
    const a = Datasets.get('A');
    a.processes[0].burstTime = 99;
    expect(Datasets.get('A').processes[0].burstTime).toBe(5);
  });

  it('bilinmeyen veri seti hata verir', () => {
    expect(() => Datasets.get('Z')).toThrow('Bilinmeyen veri seti');
  });

  it('aynı seed → birebir aynı senaryo', () => {
    expect(ScenarioGenerator.generate({ seed: 42, count: 8 })).toEqual(ScenarioGenerator.generate({ seed: 42, count: 8 }));
  });

  it('farklı seed → farklı senaryo', () => {
    const a = JSON.stringify(ScenarioGenerator.generate({ seed: 1, count: 8 }).processes);
    const b = JSON.stringify(ScenarioGenerator.generate({ seed: 2, count: 8 }).processes);
    expect(a === b).toBe(false);
  });

  it('aralıklara uyar ve geliş sırasıyla P1, P2… diye adlandırır', () => {
    const { processes } = ScenarioGenerator.generate({
      seed: 7,
      count: 50,
      maxArrival: 20,
      minBurst: 2,
      maxBurst: 6,
      minPriority: 1,
      maxPriority: 3,
    });
    expect(processes.length).toBe(50);
    processes.forEach((p, i) => {
      expect(p.id).toBe(`P${i + 1}`);
      expect(p.arrivalTime >= 0 && p.arrivalTime <= 20).toBe(true);
      expect(p.burstTime >= 2 && p.burstTime <= 6).toBe(true);
      expect(p.priority >= 1 && p.priority <= 3).toBe(true);
      if (i > 0) expect(p.arrivalTime).toBeGreaterThanOrEqual(processes[i - 1].arrivalTime);
    });
  });

  it('seed verilmezse rastgele bir seed üretip döndürür', () => {
    const { seed } = ScenarioGenerator.generate();
    expect(Number.isInteger(seed) && seed > 0).toBe(true);
  });

  it('formdan metin olarak gelen ayarlar kabul edilir', () => {
    const scenario = ScenarioGenerator.generate({ seed: '5', count: '3', maxBurst: '' });
    expect(scenario.processes.length).toBe(3);
    expect(scenario.settings.maxBurst).toBe(ScenarioGenerator.DEFAULTS.maxBurst);
  });

  it('geçersiz ayarlar reddedilir', () => {
    expect(() => ScenarioGenerator.generate({ count: 0 })).toThrow(ValidationError);
    expect(() => ScenarioGenerator.generate({ count: 'abc' })).toThrow(ValidationError);
    expect(() => ScenarioGenerator.generate({ minBurst: 5, maxBurst: 2 })).toThrow(ValidationError);
    expect(() => ScenarioGenerator.generate({ minPriority: 4, maxPriority: 1 })).toThrow(ValidationError);
    expect(() => ScenarioGenerator.generate({ seed: -1 })).toThrow(ValidationError);
    expect(() => ScenarioGenerator.generate({ count: 1000, maxBurst: 101 })).toThrow(ValidationError);
  });

  it('createRandom: [0, 1) aralığında ve tekrarlanabilir', () => {
    const a = ScenarioGenerator.createRandom(123);
    const b = ScenarioGenerator.createRandom(123);
    for (let i = 0; i < 1000; i += 1) {
      const x = a();
      expect(x >= 0 && x < 1).toBe(true);
      expect(x).toBe(b());
    }
  });
});
