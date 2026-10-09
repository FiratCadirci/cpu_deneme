/**
 * DOM yardımcıları
 *
 * Kullanıcının yazdığı metinler (process ID'leri, senaryo adları) sayfaya basılırken HTML olarak
 * yorumlanmasın diye (XSS) element'ler h() ile oluşturulur; metinler her zaman textContent'e yazılır.
 *
 *   h('button', { class: 'btn btn-primary', type: 'button', onClick: run }, 'Çalıştır')
 *   h('td', { class: 'num' }, format.decimal(4.75))
 */
(function (CodeFlow) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function append(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach((c) => append(parent, c));
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }

  function applyProps(el, props) {
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class' || key === 'className') {
        el.setAttribute('class', value);
      } else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, v);
          else el.style[prop] = v;
        }
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'text') {
        el.textContent = value;
      } else if (value === true) {
        el.setAttribute(key, '');
      } else if (key in el && !(el instanceof SVGElement) && key !== 'list' && key !== 'form') {
        el[key] = value;
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  /** HTML element oluşturur. props: class, style, dataset, onClick..., text, diğer attribute'lar */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    applyProps(el, props);
    append(el, children);
    return el;
  }

  /** SVG element oluşturur (grafikler için) */
  function svg(tag, attrs, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, String(value));
    }
    append(el, children);
    return el;
  }

  /** index.html'deki ikon sprite'ından bir ikon: icon('play') → <svg class="icon"><use href="#i-play"></svg> */
  function icon(name, extraClass) {
    const el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('class', `icon${extraClass ? ' ' + extraClass : ''}`);
    el.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#i-${name}`);
    el.appendChild(use);
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /** Dosya indirir (CSV/JSON raporları için) */
  function download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: filename, style: { display: 'none' } });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  CodeFlow.ui.dom = { h, svg, icon, clear, escapeHtml, download };
})(window.CodeFlow);
