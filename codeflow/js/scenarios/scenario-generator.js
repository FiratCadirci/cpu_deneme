/**
 * Scenario Generator — Parametrik Senaryo Laboratuvarı için rastgele process setleri üretir.
 *
 * Rastgelelik "seed"lidir: aynı seed + aynı ayarlar = birebir aynı senaryo.
 * Böylece ilginç bir senaryo bulunduğunda seed not edilip sunumda tekrar gösterilebilir.
 */
(function (CodeFlow) {
  'use strict';

  const { ValidationError } = CodeFlow.errors;
  const { isBlank } = CodeFlow.utils;
  const { LIMITS } = CodeFlow.models.Process;

  const DEFAULTS = Object.freeze({
    count: 5,
    maxArrival: 10,
    minBurst: 1,
    maxBurst: 10,
    minPriority: 1,
    maxPriority: 5,
  });

  const MAX_SEED = 999999999;

  /** mulberry32: küçük ve hızlı, seed'li sözde rastgele sayı üreteci. 0 ≤ x < 1 döndürür. */
  function createRandom(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    return Math.floor(Math.random() * MAX_SEED) + 1;
  }

  function validateSettings(s) {
    const errors = [];
    const check = (key, label, min, max) => {
      if (!Number.isInteger(s[key]) || s[key] < min || s[key] > max) {
        errors.push({ index: null, field: key, message: `${label} ${min} ile ${max} arasında bir tam sayı olmalı.` });
      }
    };
    check('count', 'Process sayısı', 1, LIMITS.maxProcesses);
    check('maxArrival', 'En geç geliş zamanı', 0, LIMITS.maxTime);
    check('minBurst', 'En kısa burst', 1, LIMITS.maxTime);
    check('maxBurst', 'En uzun burst', 1, LIMITS.maxTime);
    check('minPriority', 'En küçük priority', 0, LIMITS.maxPriority);
    check('maxPriority', 'En büyük priority', 0, LIMITS.maxPriority);
    check('seed', 'Seed', 0, MAX_SEED);
    if (errors.length === 0 && s.minBurst > s.maxBurst) {
      errors.push({ index: null, field: 'maxBurst', message: 'En uzun burst, en kısa burst\'ten küçük olamaz.' });
    }
    if (errors.length === 0 && s.minPriority > s.maxPriority) {
      errors.push({ index: null, field: 'maxPriority', message: 'En büyük priority, en küçük priority\'den küçük olamaz.' });
    }
    if (errors.length === 0 && s.count * s.maxBurst > LIMITS.maxTotalBurst) {
      errors.push({
        index: null,
        field: 'maxBurst',
        message: `Process sayısı × en uzun burst en fazla ${LIMITS.maxTotalBurst} olabilir.`,
      });
    }
    if (errors.length > 0) throw new ValidationError(errors);
  }

  /**
   * @param {Object} [settings]  count, maxArrival, minBurst, maxBurst, minPriority, maxPriority, seed
   * @returns {{seed: number, settings: Object, processes: Array<Object>}}
   */
  function generate(settings = {}) {
    const s = { ...DEFAULTS };
    for (const [key, value] of Object.entries(settings)) {
      if (!isBlank(value)) s[key] = Number(value);
    }
    if (s.seed === undefined) s.seed = randomSeed();
    validateSettings(s);

    const random = createRandom(s.seed);
    const between = (min, max) => min + Math.floor(random() * (max - min + 1));

    const drafts = Array.from({ length: s.count }, () => ({
      arrivalTime: between(0, s.maxArrival),
      burstTime: between(s.minBurst, s.maxBurst),
      priority: between(s.minPriority, s.maxPriority),
    }));

    // Okunabilirlik için geliş sırasına diz ve P1, P2, ... diye adlandır
    drafts.sort((a, b) => a.arrivalTime - b.arrivalTime);
    const processes = drafts.map((draft, i) => ({ id: `P${i + 1}`, ...draft }));

    return { seed: s.seed, settings: s, processes };
  }

  CodeFlow.scenarios.ScenarioGenerator = { generate, createRandom, DEFAULTS, MAX_SEED };
})(window.CodeFlow);
