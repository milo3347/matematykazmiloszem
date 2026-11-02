/*
  Zgoda na cookies + Google Analytics / Google Ads + wczytywanie kalendarza.

  CO UZUPEŁNIĆ (tylko ten blok):
    GA_ID  - identyfikator pomiaru Google Analytics 4 (zaczyna się od G-)
    ADS_ID - identyfikator konta Google Ads (zaczyna się od AW-), opcjonalnie
    ADS_LEAD_LABEL - pełna etykieta konwersji z Google Ads, opcjonalnie,
                     np. 'AW-123456789/AbCdEfGhIjK'

  Dopóki identyfikatory są puste lub zostają jako przykład (G-XXXXXXXXXX),
  żaden skrypt Google Analytics ani Ads NIE jest ładowany.
  Skrypty Google ładują się dopiero po kliknięciu "Akceptuję wszystkie".
*/
(function () {
  'use strict';

  var CFG = {
    GA_ID: 'G-XXXXXXXXXX',
    ADS_ID: 'AW-18543832701',
    ADS_LEAD_LABEL: '',
    POLICY_URL: 'polityka-prywatnosci.html'
  };

  var KEY = 'cookie_consent_v1';
  var MAX_AGE = 365 * 24 * 3600 * 1000; // zgoda ważna 12 miesięcy
  var googleLoaded = false;

  function validId(id) {
    return /^(G|AW|GT)-[A-Z0-9]{4,}$/.test(id || '') && !/^G-X+$/.test(id);
  }

  function readConsent() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.t && Date.now() - o.t < MAX_AGE) { return o.v; }
    } catch (e) {}
    return null;
  }

  function writeConsent(v) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  /* ---------- Google Analytics / Ads (dopiero po zgodzie) ---------- */
  function loadGoogle() {
    if (googleLoaded) { return; }
    var ids = [CFG.GA_ID, CFG.ADS_ID].filter(validId);
    if (!ids.length) { return; }
    googleLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Consent Mode v2: domyślnie "denied", po zgodzie "granted"
    window.gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('consent', 'update', {
      ad_storage: 'granted', ad_user_data: 'granted',
      ad_personalization: 'granted', analytics_storage: 'granted'
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ids[0]);
    document.head.appendChild(s);
    ids.forEach(function (id) { window.gtag('config', id); });
  }

  function clearGoogleCookies() {
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) {
      var d = parts.slice(i).join('.');
      domains.push('; domain=' + d, '; domain=.' + d);
    }
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gat|_gcl|_gac)/.test(name)) {
        domains.forEach(function (dom) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + dom;
        });
      }
    });
  }

  /* ---------- zdarzenia (tylko gdy jest zgoda i Google załadowany) ---------- */
  function ev(name, params) {
    if (googleLoaded && window.gtag) { window.gtag('event', name, params || {}); }
  }

  function lead(method) {
    ev('generate_lead', { method: method });
    if (googleLoaded && window.gtag && CFG.ADS_LEAD_LABEL) {
      window.gtag('event', 'conversion', { send_to: CFG.ADS_LEAD_LABEL });
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a,button') : null;
    if (!el) { return; }
    var href = el.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) { lead('phone'); }
    else if (href.indexOf('mailto:') === 0) { lead('email'); }
    else if (el.id === 'cal-load') { ev('calendar_open'); }
    else if (/#kontakt$/.test(href) && el.classList.contains('btn')) {
      ev('cta_click', { location: el.classList.contains('fab') ? 'floating' : 'page' });
    }
  });

  /* ---------- kalendarz rezerwacji (treść Google, po zgodzie lub po kliknięciu) ---------- */
  function loadCalendar() {
    var box = document.getElementById('cal-frame');
    if (!box || box.getAttribute('data-loaded')) { return; }
    var f = document.createElement('iframe');
    f.src = box.getAttribute('data-src');
    f.title = 'Kalendarz rezerwacji lekcji próbnej';
    f.loading = 'lazy';
    f.style.cssText = 'border:0;width:100%;height:600px;display:block';
    box.appendChild(f);
    box.hidden = false;
    box.setAttribute('data-loaded', '1');
    var gate = document.getElementById('cal-gate');
    if (gate) { gate.hidden = true; }
  }

  /* ---------- baner ---------- */
  function injectCss() {
    var st = document.createElement('style');
    st.textContent =
      '#cookie-banner{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));' +
      'width:min(520px,calc(100% - 32px));z-index:30;background:var(--card,#fff);color:var(--ink,#1b2437);' +
      'border:2px solid var(--ink,#1c2b4a);border-radius:8px;box-shadow:5px 5px 0 var(--ink,#1c2b4a);' +
      'padding:18px;font:400 15px/1.5 var(--body,system-ui,sans-serif)}' +
      '#cookie-banner .cb-title{margin:0 0 6px;font-weight:700;font-size:1.05rem}' +
      '#cookie-banner .cb-text{margin:0 0 14px;color:var(--muted,#55627a);max-width:none}' +
      '#cookie-banner a{color:inherit}' +
      '#cookie-banner .cb-actions{display:flex;gap:10px}' +
      '#cookie-banner .cb-btn{flex:1;font:600 15px var(--body,system-ui,sans-serif);padding:11px 12px;' +
      'border-radius:8px;border:2px solid var(--ink,#1c2b4a);background:var(--ink,#1c2b4a);' +
      'color:var(--paper,#fff);cursor:pointer}' +
      '#cookie-banner .cb-btn:focus-visible{outline:3px solid #c0392b;outline-offset:2px}' +
      '@media(min-width:900px){#cookie-banner{left:auto;right:16px;width:440px}}' +
      'body.cookie-open .fab{display:none!important}';
    document.head.appendChild(st);
  }

  function closeBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) { b.parentNode.removeChild(b); }
    document.body.classList.remove('cookie-open');
  }

  function showBanner() {
    if (document.getElementById('cookie-banner')) { return; }
    var b = document.createElement('div');
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-labelledby', 'cb-title');
    b.innerHTML =
      '<p id="cb-title" class="cb-title">Pliki cookies</p>' +
      '<p class="cb-text">Za Twoją zgodą włączę Google Analytics i Google Ads (statystyki i pomiar reklam) ' +
      'oraz kalendarz z serwerów Google. Szczegóły w <a href="' + CFG.POLICY_URL + '">polityce prywatności</a>.</p>' +
      '<div class="cb-actions">' +
      '<button type="button" class="cb-btn" data-c="necessary">Tylko niezbędne</button>' +
      '<button type="button" class="cb-btn" data-c="all">Akceptuję wszystkie</button>' +
      '</div>';
    document.body.appendChild(b);
    document.body.classList.add('cookie-open');
    b.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button[data-c]') : null;
      if (t) { choose(t.getAttribute('data-c')); }
    });
  }

  function choose(v) {
    var before = readConsent();
    writeConsent(v);
    closeBanner();
    if (v === 'all') {
      loadGoogle();
      loadCalendar();
    } else if (before === 'all') {
      clearGoogleCookies();
      location.reload();
    }
  }

  function init() {
    injectCss();
    var v = readConsent();
    if (v === 'all') { loadGoogle(); loadCalendar(); }
    else if (v !== 'necessary') { showBanner(); }

    var cal = document.getElementById('cal-load');
    if (cal) { cal.addEventListener('click', loadCalendar); }

    var links = document.querySelectorAll('[data-cookie-settings]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
    }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
