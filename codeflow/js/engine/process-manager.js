/**
 * Process Manager — kullanıcıdan gelen process listesini doğrular ve simülasyona hazırlar.
 *
 * Mimarideki yeri:  UI / Kullanıcı Girdisi → [Process Manager] → Scheduling Engine
 *
 * Kurallar:
 *   - En az 1, en fazla 1000 process
 *   - ID boş olamaz ve tekrar edemez
 *   - Arrival Time ≥ 0, Burst Time ≥ 1, Priority ≥ 0 — hepsi tam sayı
 *   - Priority boş bırakılırsa varsayılan değer (1) kullanılır
 */
(function (CodeFlow) {
  'use strict';

  const { Process } = CodeFlow.models;
  const { ValidationError } = CodeFlow.errors;
  const { isBlank } = CodeFlow.utils;
  const { LIMITS } = Process;

  const FIELDS = Object.freeze([
    { key: 'arrivalTime', label: 'Arrival Time', min: 0, max: LIMITS.maxTime, required: true },
    { key: 'burstTime', label: 'Burst Time', min: 1, max: LIMITS.maxTime, required: true },
    { key: 'priority', label: 'Priority', min: 0, max: LIMITS.maxPriority, required: false },
  ]);

  /**
   * Listeyi doğrular. Hata yoksa boş dizi döner.
   * @returns {{index: number|null, field: string|null, message: string}[]}
   */
  function validate(list) {
    if (!Array.isArray(list) || list.length === 0) {
      return [{ index: null, field: null, message: 'En az bir process girmelisiniz.' }];
    }
    if (list.length > LIMITS.maxProcesses) {
      return [{ index: null, field: null, message: `En fazla ${LIMITS.maxProcesses} process girilebilir (şu an ${list.length}).` }];
    }

    const errors = [];
    const firstRowOfId = new Map();

    list.forEach((raw, index) => {
      const row = `Satır ${index + 1}`;
      const id = raw && !isBlank(raw.id) ? String(raw.id).trim() : '';
      const where = id ? `${row} (${id})` : row;

      if (!id) {
        errors.push({ index, field: 'id', message: `${row}: Process ID boş olamaz.` });
      } else if (id.length > LIMITS.maxIdLength) {
        errors.push({ index, field: 'id', message: `${row}: Process ID en fazla ${LIMITS.maxIdLength} karakter olabilir.` });
      } else if (firstRowOfId.has(id)) {
        errors.push({ index, field: 'id', message: `${row}: "${id}" ID'si daha önce kullanılmış (satır ${firstRowOfId.get(id) + 1}).` });
      } else {
        firstRowOfId.set(id, index);
      }

      for (const field of FIELDS) {
        const value = raw ? raw[field.key] : undefined;
        if (isBlank(value)) {
          if (field.required) errors.push({ index, field: field.key, message: `${where}: ${field.label} boş olamaz.` });
          continue;
        }
        const number = Number(value);
        if (!Number.isInteger(number)) {
          errors.push({ index, field: field.key, message: `${where}: ${field.label} tam sayı olmalı ("${value}" geçersiz).` });
        } else if (number < field.min || number > field.max) {
          errors.push({ index, field: field.key, message: `${where}: ${field.label} ${field.min} ile ${field.max} arasında olmalı.` });
        }
      }
    });

    if (errors.length === 0) {
      const totalBurst = list.reduce((sum, raw) => sum + Number(raw.burstTime), 0);
      if (totalBurst > LIMITS.maxTotalBurst) {
        errors.push({
          index: null,
          field: 'burstTime',
          message: `Burst Time'ların toplamı en fazla ${LIMITS.maxTotalBurst} olabilir (şu an ${totalBurst}).`,
        });
      }
    }

    return errors;
  }

  /**
   * Doğrular ve değiştirilemez (frozen) Process listesine çevirir.
   * @throws {ValidationError} girdi hatalıysa
   * @returns {ReadonlyArray<Process>}
   */
  function prepare(list) {
    const errors = validate(list);
    if (errors.length > 0) throw new ValidationError(errors);
    return Object.freeze(list.map((raw, index) => Process.create(raw, index)));
  }

  CodeFlow.engine.ProcessManager = { validate, prepare, FIELDS };
})(window.CodeFlow);
