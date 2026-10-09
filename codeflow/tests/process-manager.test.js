describe('Process Manager — girdi doğrulama', () => {
  const { CF, dataset, proc } = T;
  const PM = CF.engine.ProcessManager;
  const { ValidationError } = CF.errors;
  const errorFields = (list) => PM.validate(list).map((e) => `${e.index}:${e.field}`);

  it('geçerli liste hata vermez', () => {
    expect(PM.validate(dataset('A'))).toEqual([]);
  });

  it('boş liste reddedilir', () => {
    expect(PM.validate([]).length).toBe(1);
    expect(() => PM.prepare([])).toThrow(ValidationError);
  });

  it('dizi olmayan girdi reddedilir', () => {
    expect(PM.validate(null).length).toBe(1);
    expect(PM.validate('P1').length).toBe(1);
  });

  it('ID boş olamaz', () => {
    expect(errorFields([{ id: '  ', arrivalTime: 0, burstTime: 1 }])).toEqual(['0:id']);
  });

  it('ID tekrar edemez', () => {
    const errors = PM.validate([proc('P1', 0, 1), proc('P1', 1, 1)]);
    expect(errors.length).toBe(1);
    expect(errors[0].index).toBe(1);
    expect(errors[0].message).toContain('daha önce kullanılmış');
  });

  it('Arrival Time negatif olamaz', () => {
    expect(errorFields([proc('P1', -1, 1)])).toEqual(['0:arrivalTime']);
  });

  it('Burst Time en az 1 olmalı', () => {
    expect(errorFields([proc('P1', 0, 0)])).toEqual(['0:burstTime']);
  });

  it('ondalık sayılar reddedilir', () => {
    expect(errorFields([proc('P1', 0.5, 2.5)])).toEqual(['0:arrivalTime', '0:burstTime']);
  });

  it('sayı olmayan ve boş değerler reddedilir', () => {
    expect(errorFields([{ id: 'P1', arrivalTime: 'abc', burstTime: '' }])).toEqual(['0:arrivalTime', '0:burstTime']);
  });

  it('negatif priority reddedilir', () => {
    expect(errorFields([proc('P1', 0, 1, -1)])).toEqual(['0:priority']);
  });

  it('formdan metin olarak gelen sayılar kabul edilir', () => {
    const [p] = PM.prepare([{ id: ' P1 ', arrivalTime: '2', burstTime: '3', priority: '4' }]);
    expect(p).toEqual({ id: 'P1', arrivalTime: 2, burstTime: 3, priority: 4, index: 0 });
  });

  it('1000\'den fazla process reddedilir', () => {
    const many = Array.from({ length: 1001 }, (_, i) => proc(`P${i + 1}`, 0, 1));
    expect(PM.validate(many)[0].message).toContain('En fazla 1000');
  });

  it('toplam burst sınırı aşılırsa reddedilir', () => {
    const errors = PM.validate([proc('P1', 0, 60000), proc('P2', 0, 50000)]);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('toplamı');
  });

  it('hazırlanan liste ve process\'ler değiştirilemez (frozen)', () => {
    const list = PM.prepare(dataset('A'));
    expect(Object.isFrozen(list)).toBe(true);
    expect(Object.isFrozen(list[0])).toBe(true);
  });

  it('tüm hatalar tek seferde raporlanır', () => {
    const errors = PM.validate([proc('', -1, 0), proc('P2', 0, 1)]);
    expect(errors.length).toBe(3);
  });

  it('ValidationError tüm hata listesini taşır', () => {
    const error = expect(() => PM.prepare([proc('P1', -1, 0)])).toThrow(ValidationError);
    expect(error.errors.length).toBe(2);
  });
});
