/**
 * Landing page davranışları: mobil menü, aktif menü bağlantısı, header gölgesi ve
 * tanıtım bölümlerindeki "Simülatörde Dene" / "Hazır Örnekle Dene" kısayolları.
 *
 * Simülatöre doğrudan dokunmaz; özel olaylar (CustomEvent) yayınlar, app.js bunları dinler:
 *   codeflow:select-algorithm  detail: { algorithmId }
 *   codeflow:load-dataset      detail: { datasetId, algorithmId? }
 */
(function () {
  'use strict';

  function setupNav() {
    const header = document.querySelector('.header');
    const nav = document.getElementById('site-nav');
    const toggle = document.querySelector('.nav-toggle');
    if (!header || !nav || !toggle) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      toggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    };

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /** Ekranda görünen bölüme karşılık gelen menü bağlantısını vurgular */
  function setupScrollSpy() {
    const links = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = `#${entry.target.id}`;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
  }

  function setupSimulatorShortcuts() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-try-algorithm], [data-try-dataset]');
      if (!button) return;

      const algorithmId = button.dataset.tryAlgorithm;
      const datasetId = button.dataset.tryDataset;
      if (datasetId) {
        document.dispatchEvent(new CustomEvent('codeflow:load-dataset', { detail: { datasetId, algorithmId } }));
      } else if (algorithmId) {
        document.dispatchEvent(new CustomEvent('codeflow:select-algorithm', { detail: { algorithmId } }));
      }

      const simulator = document.getElementById('simulator');
      if (simulator) simulator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setupYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = year;
    });
  }

  setupNav();
  setupScrollSpy();
  setupSimulatorShortcuts();
  setupYear();
})();
