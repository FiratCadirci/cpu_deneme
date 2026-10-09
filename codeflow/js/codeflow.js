/**
 * CodeFlow — CPU Zamanlama Simülatörü
 *
 * Tüm modüllerin paylaştığı isim alanı (namespace). Her dosya kendini bu nesneye ekler,
 * bu yüzden script'ler index.html'de bağımlılık sırasına göre yüklenir:
 *
 *   codeflow → models → process-manager → algorithms → metrics → engine → comparison → scenarios → visualization → ui
 *
 * import/export (ES module) yerine bu yöntemi seçtik çünkü sayfa, sunucu kurmadan
 * index.html'e çift tıklanarak (file://) da çalışabilmeli.
 */
(function (global) {
  'use strict';

  /** Kullanıcı girdisi hatalı olduğunda fırlatılır. errors: [{ index, field, message }] */
  class ValidationError extends Error {
    constructor(errors) {
      super(errors.map((e) => e.message).join('\n'));
      this.name = 'ValidationError';
      this.errors = errors;
    }
  }

  /** Bir algoritma fiziksel olarak imkânsız bir plan ürettiğinde fırlatılır (örn. iki process aynı anda CPU'da). */
  class ScheduleError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ScheduleError';
    }
  }

  /** Formdan gelen boş değerleri ayırt etmek için: undefined, null, '' ve sadece boşluk → boş */
  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  global.CodeFlow = {
    version: '0.1.0',
    errors: { ValidationError, ScheduleError },
    utils: { isBlank },
    models: {},
    engine: {},
    algorithms: {},
    comparison: {},
    scenarios: {},
    visualization: {},
    ui: {},
  };
})(window);
