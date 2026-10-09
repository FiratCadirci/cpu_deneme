/**
 * Mini test çatısı — Node.js / npm kurmadan testleri tarayıcıda çalıştırır.
 * Kullanım: tests/index.html dosyasını tarayıcıda açın.
 *
 *   describe('FCFS', () => {
 *     it('geliş sırasına göre çalıştırır', () => {
 *       expect(sonuc).toBe(beklenen);
 *     });
 *   });
 */
(function (global) {
  'use strict';

  const suites = [];
  let currentSuite = null;

  class AssertionError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AssertionError';
    }
  }

  function describe(name, body) {
    const suite = { name, tests: [] };
    suites.push(suite);
    currentSuite = suite;
    try {
      body();
    } finally {
      currentSuite = null;
    }
  }

  function it(name, body) {
    if (!currentSuite) throw new Error('it() bir describe() bloğunun içinde çağrılmalı.');
    currentSuite.tests.push({ name, body });
  }

  function show(value) {
    if (typeof value === 'string') return JSON.stringify(value);
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
  }

  function expect(actual) {
    const fail = (message) => {
      throw new AssertionError(message);
    };
    const mismatch = (expected) => `Beklenen: ${show(expected)}\nGelen:    ${show(actual)}`;

    return {
      toBe(expected) {
        if (!Object.is(actual, expected)) fail(mismatch(expected));
      },
      toEqual(expected) {
        if (!deepEqual(actual, expected)) fail(mismatch(expected));
      },
      toBeCloseTo(expected, decimals = 2) {
        if (!(Math.abs(actual - expected) < Math.pow(10, -decimals) / 2)) fail(`${mismatch(expected)} (${decimals} basamak hassasiyetle)`);
      },
      toBeTruthy() {
        if (!actual) fail(`Doğru (truthy) bir değer bekleniyordu, gelen: ${show(actual)}`);
      },
      toBeFalsy() {
        if (actual) fail(`Yanlış (falsy) bir değer bekleniyordu, gelen: ${show(actual)}`);
      },
      toBeLessThanOrEqual(limit) {
        if (!(actual <= limit + 1e-9)) fail(`${show(actual)} ≤ ${show(limit)} olmalıydı`);
      },
      toBeGreaterThanOrEqual(limit) {
        if (!(actual >= limit - 1e-9)) fail(`${show(actual)} ≥ ${show(limit)} olmalıydı`);
      },
      toContain(item) {
        if (!actual || !actual.includes(item)) fail(`${show(actual)} içinde ${show(item)} bekleniyordu`);
      },
      /** expected: hata sınıfı, mesajda geçmesi gereken metin veya RegExp */
      toThrow(expected) {
        let error = null;
        try {
          actual();
        } catch (e) {
          error = e;
        }
        if (!error) fail('Hata fırlatılması bekleniyordu ama fırlatılmadı.');
        if (typeof expected === 'function' && !(error instanceof expected)) {
          fail(`${expected.name} bekleniyordu, ${error.name} geldi: ${error.message}`);
        }
        if (typeof expected === 'string' && !String(error.message).includes(expected)) {
          fail(`Hata mesajında "${expected}" bekleniyordu, gelen: "${error.message}"`);
        }
        if (expected instanceof RegExp && !expected.test(error.message)) {
          fail(`Hata mesajı ${expected} ile eşleşmeliydi, gelen: "${error.message}"`);
        }
        return error;
      },
    };
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function render(results, totalMs) {
    const failed = results.filter((r) => !r.ok);
    const passed = results.length - failed.length;
    const container = document.getElementById('test-results');

    let html = `<div class="summary ${failed.length ? 'fail' : 'pass'}">
      <strong>${failed.length ? '✗' : '✓'} ${passed}/${results.length} test geçti</strong>
      <span>${totalMs.toFixed(0)} ms</span>
    </div>`;

    for (const suite of suites) {
      const items = results.filter((r) => r.suite === suite.name);
      const suiteFailed = items.some((r) => !r.ok);
      html += `<section class="suite ${suiteFailed ? 'fail' : 'pass'}"><h2>${escapeHtml(suite.name)}</h2><ul>`;
      for (const r of items) {
        html += `<li class="${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓' : '✗'} ${escapeHtml(r.name)}`;
        if (!r.ok) html += `<pre>${escapeHtml(r.error)}</pre>`;
        html += '</li>';
      }
      html += '</ul></section>';
    }
    container.innerHTML = html;

    document.title = `${failed.length ? '✗' : '✓'} ${passed}/${results.length} — CodeFlow Testleri`;
    document.body.dataset.status = failed.length ? 'fail' : 'pass';

    // Komut satırından okunabilsin diye makine-okunur özet
    const report = document.getElementById('test-report');
    if (report) {
      report.textContent = JSON.stringify({
        passed,
        failed: failed.length,
        total: results.length,
        failures: failed.map((r) => ({ suite: r.suite, name: r.name, error: r.error })),
      });
    }
  }

  function runTests() {
    const results = [];
    const startedAll = performance.now();
    for (const suite of suites) {
      for (const test of suite.tests) {
        try {
          test.body();
          results.push({ suite: suite.name, name: test.name, ok: true });
        } catch (error) {
          const message = error && error.stack && !(error instanceof AssertionError) ? `${error.message}\n${error.stack}` : String(error && error.message);
          results.push({ suite: suite.name, name: test.name, ok: false, error: message });
        }
      }
    }
    render(results, performance.now() - startedAll);
    return results;
  }

  global.describe = describe;
  global.it = it;
  global.expect = expect;
  global.runTests = runTests;
})(window);
