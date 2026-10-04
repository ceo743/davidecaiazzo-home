/* Consenso cookie DC Academy. Caricare prima degli script facoltativi.
   Gli script facoltativi restano type="text/plain" con data-dc-consentcategory.
   Non caricare CookieScript insieme a questo gestore. */
(function () {
  'use strict';
  if (window.DCCookieConsent) return;

  var COOKIE = 'dc_cookie_consent';
  var VERSION = '20261004';
  var MAX_AGE = 180 * 24 * 60 * 60;
  var POLICY_URL = 'https://docs.google.com/document/d/1PTTs2QFMqBtZaefLHPrrfMxJRnlGewih/edit';
  var loadedCategories = [];
  var reloadQueued = false;
  var state = readConsent();

  function allowedHost() {
    return window.location.hostname === 'davidecaiazzo.it' ||
      /\.davidecaiazzo\.it$/.test(window.location.hostname);
  }

  function readConsent() {
    var part = document.cookie.split(';').map(function (item) { return item.trim(); }).filter(function (item) {
      return item.indexOf(COOKIE + '=') === 0;
    })[0];
    if (!part) return null;
    try {
      var value = JSON.parse(decodeURIComponent(part.slice(COOKIE.length + 1)));
      if (!value || value.version !== VERSION || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
          !value.categories || typeof value.categories.performance !== 'boolean' ||
          typeof value.categories.targeting !== 'boolean') return null;
      return { performance: value.categories.performance, targeting: value.categories.targeting };
    } catch (_) { return null; }
  }

  function writeConsent(choices) {
    if (!allowedHost()) return false;
    var value = {
      version: VERSION,
      categories: { performance: !!choices.performance, targeting: !!choices.targeting },
      date: new Date().toISOString().slice(0, 10)
    };
    document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(value)) +
      '; Domain=.davidecaiazzo.it; Path=/; Max-Age=' + MAX_AGE + '; Secure; SameSite=Lax';
    var saved = readConsent();
    return !!saved && saved.performance === value.categories.performance &&
      saved.targeting === value.categories.targeting;
  }

  function paths() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var list = ['/'];
    while (parts.length) {
      list.push('/' + parts.join('/'));
      list.push('/' + parts.join('/') + '/');
      parts.pop();
    }
    return list;
  }

  function clearKnownOptionalCookies(lost) {
    if (!lost.length) return;
    var host = window.location.hostname;
    var domains = ['', host, '.' + host, 'davidecaiazzo.it', '.davidecaiazzo.it'];
    document.cookie.split(';').forEach(function (item) {
      var name = item.trim().split('=')[0];
      var analytics = lost.indexOf('performance') !== -1 &&
        (/^_ga(?:_|$)/.test(name) || name === '_gid' || /^_gat(?:_|$)/.test(name));
      var ads = lost.indexOf('targeting') !== -1 &&
        (name === '_fbp' || name === '_fbc' || name === '_gcl_au' ||
          /^rl_(session|anonymous_id|page_init_referrer)$/.test(name));
      if (!analytics && !ads) return;
      paths().forEach(function (path) {
        domains.forEach(function (domain) {
          document.cookie = name + '=; Max-Age=0; Path=' + path +
            (domain ? '; Domain=' + domain : '') + '; Secure; SameSite=Lax';
        });
      });
    });
  }

  function loadAllowedScripts() {
    if (!state || !allowedHost() || reloadQueued) return;
    var originals = document.querySelectorAll('script[type="text/plain"][data-dc-consentcategory]:not([data-cookiescript])');
    Array.prototype.forEach.call(originals, function (original) {
      if (original.getAttribute('data-dc-consent-loaded') === '1') return;
      var required = (original.getAttribute('data-dc-consentcategory') || '').split(/\s+/).filter(Boolean);
      if (!required.length || !required.every(function (category) {
        return (category === 'performance' || category === 'targeting') && state[category] === true;
      })) return;

      var script = document.createElement('script');
      Array.prototype.forEach.call(original.attributes, function (attribute) {
        if (['type', 'src', 'async', 'data-dc-consentcategory', 'data-dc-consent-loaded'].indexOf(attribute.name) === -1) {
          script.setAttribute(attribute.name, attribute.value);
        }
      });
      script.type = 'text/javascript';
      script.async = original.hasAttribute('async');
      script.textContent = original.textContent;
      if (original.hasAttribute('src')) script.src = original.getAttribute('src');
      original.setAttribute('data-dc-consent-loaded', '1');
      original.parentNode.insertBefore(script, original.nextSibling);
      required.forEach(function (category) {
        if (loadedCategories.indexOf(category) === -1) loadedCategories.push(category);
      });
    });
  }

  function setError(message) {
    var note = document.getElementById('dc-consent-error');
    if (note) note.textContent = message || '';
  }

  function updateVisibility() {
    var banner = document.getElementById('dc-consent-banner');
    var preferences = document.getElementById('dc-consent-preferences');
    if (banner) banner.hidden = !!state;
    if (preferences) preferences.hidden = !state;
  }

  function choose(choices) {
    var previous = state;
    if (!writeConsent(choices)) {
      state = null;
      setError(loadedCategories.length
        ? 'Scelta non salvata. I contenuti già attivi possono restare fino alla chiusura della pagina.'
        : 'Scelta non salvata. I cookie facoltativi restano disattivati.');
      updateVisibility();
      return;
    }
    state = { performance: !!choices.performance, targeting: !!choices.targeting };
    var lost = ['performance', 'targeting'].filter(function (category) {
      return !state[category] && (!previous || previous[category]);
    });
    clearKnownOptionalCookies(lost);
    updateVisibility();
    if (lost.some(function (category) { return loadedCategories.indexOf(category) !== -1; })) {
      reloadQueued = true;
      window.location.reload();
      return;
    }
    loadAllowedScripts();
  }

  function element(name, text, className) {
    var node = document.createElement(name);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function openPreferences() {
    var banner = document.getElementById('dc-consent-banner');
    var panel = document.getElementById('dc-consent-panel');
    if (!banner || !panel) return;
    var performance = document.getElementById('dc-consent-performance');
    var targeting = document.getElementById('dc-consent-targeting');
    performance.checked = !!(state && state.performance);
    targeting.checked = !!(state && state.targeting);
    banner.hidden = false;
    panel.hidden = false;
    document.getElementById('dc-consent-preferences').hidden = true;
    performance.focus();
  }

  function render() {
    if (document.getElementById('dc-consent-banner')) return;
    var style = element('style');
    style.textContent = '#dc-consent-banner{position:fixed;inset:auto 16px var(--dc-consent-bottom,16px);max-width:680px;margin:auto;z-index:2147483647;background:#101c32;color:#fff;border:1px solid #64748b;border-radius:12px;box-shadow:0 12px 40px #0006;padding:18px;font:15px/1.45 system-ui,sans-serif}#dc-consent-banner[hidden],#dc-consent-panel[hidden],#dc-consent-preferences[hidden]{display:none!important}#dc-consent-banner p{margin:0 0 12px}#dc-consent-banner a{color:#fff;text-decoration:underline}#dc-consent-banner .dc-consent-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}#dc-consent-banner button{background:transparent;color:#fff;border:1px solid #fff;border-radius:7px;padding:9px 14px;font:inherit;cursor:pointer;min-width:120px}#dc-consent-banner button.dc-primary{background:#fff;color:#101c32}#dc-consent-panel{border-top:1px solid #64748b;margin-top:14px;padding-top:12px}#dc-consent-panel label{display:block;margin:9px 0}#dc-consent-error{color:#ffd6a5;margin-top:8px}#dc-consent-preferences{position:fixed;left:16px;bottom:var(--dc-consent-bottom,16px);z-index:2147483646;background:#101c32;color:#fff;border:1px solid #fff;border-radius:7px;padding:8px 12px;font:14px system-ui,sans-serif;cursor:pointer}';
    document.head.appendChild(style);

    var banner = element('section');
    banner.id = 'dc-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferenze cookie');
    banner.appendChild(element('p', 'Cookie necessari e, se acconsenti, statistiche e pubblicità. Rifiuta o scegli le categorie.'));
    var policy = element('a', 'Informativa cookie');
    policy.href = POLICY_URL;
    policy.target = '_blank';
    policy.rel = 'noopener noreferrer';
    banner.appendChild(policy);
    var actions = element('div', '', 'dc-consent-actions');
    var reject = element('button', 'Rifiuta tutto');
    reject.type = 'button';
    reject.addEventListener('click', function () { choose({ performance: false, targeting: false }); });
    var accept = element('button', 'Accetta tutto');
    accept.type = 'button';
    accept.addEventListener('click', function () { choose({ performance: true, targeting: true }); });
    var manage = element('button', 'Gestisci');
    manage.type = 'button';
    manage.addEventListener('click', openPreferences);
    actions.appendChild(reject);
    actions.appendChild(accept);
    actions.appendChild(manage);
    banner.appendChild(actions);

    var panel = element('div');
    panel.id = 'dc-consent-panel';
    panel.hidden = true;
    panel.appendChild(element('p', 'I cookie necessari restano attivi. Scegli le categorie facoltative.'));
    [['performance', 'Statistiche'], ['targeting', 'Pubblicità']].forEach(function (item) {
      var label = element('label');
      var input = element('input');
      input.type = 'checkbox';
      input.id = 'dc-consent-' + item[0];
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + item[1]));
      panel.appendChild(label);
    });
    var save = element('button', 'Salva le preferenze', 'dc-primary');
    save.type = 'button';
    save.addEventListener('click', function () {
      choose({
        performance: document.getElementById('dc-consent-performance').checked,
        targeting: document.getElementById('dc-consent-targeting').checked
      });
    });
    panel.appendChild(save);
    banner.appendChild(panel);
    var error = element('p');
    error.id = 'dc-consent-error';
    error.setAttribute('role', 'status');
    banner.appendChild(error);
    document.body.appendChild(banner);

    var preferences = element('button', 'Preferenze cookie');
    preferences.id = 'dc-consent-preferences';
    preferences.type = 'button';
    preferences.addEventListener('click', openPreferences);
    document.body.appendChild(preferences);
    updateVisibility();
  }

  function start() {
    clearKnownOptionalCookies(['performance', 'targeting'].filter(function (category) {
      return !state || !state[category];
    }));
    render();
    loadAllowedScripts();
  }

  window.DCCookieConsent = { open: openPreferences };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
