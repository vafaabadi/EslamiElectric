/**
 * International phone fields (intl-tel-input). Load intlTelInput.min.css + intl-phone.css + intlTelInput.min.js before this file.
 * Uses /api/locale-hint country for initial dial code (e.g. IR → +98, PK → +92).
 * Requires international format with country code (+… or 00… normalized to +).
 */
(function (global) {
  var ITI_VER = '19.5.6';
  var UTILS = 'https://cdn.jsdelivr.net/npm/intl-tel-input@' + ITI_VER + '/build/js/utils.js';

  var instances = new WeakMap();

  /**
   * E.164-style strings often use +; many users type 00 (international prefix) instead.
   * Normalize so validation and regex fallbacks match both forms.
   */
  function normalizeLeadingIntlPrefix(s) {
    if (!s) return '';
    var t = String(s).trim().replace(/\s/g, '');
    if (t.charAt(0) === '+') return t;
    if (t.indexOf('00') === 0 && t.length > 4 && /^00[1-9]\d{6,}$/.test(t)) {
      return '+' + t.slice(2);
    }
    return t;
  }

  /**
   * intl-tel-input updates the flag from +country… but not from 00… (common user habit).
   * Convert 00 → + and setNumber so the dropdown matches the dialled country (e.g. 0044 → +44 → GB).
   */
  function compactDigits(s) {
    return String(s || '').replace(/\s/g, '');
  }

  function attachDoubleZeroToPlusHandler(iti, input) {
    var debounceMs = 120;
    var t = null;
    input.addEventListener('input', function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        var compact = compactDigits(input.value);
        if (compact.indexOf('00') !== 0) return;
        if (compact.length < 4) return;
        var plusForm = '+' + compact.slice(2);
        try {
          var before = '';
          try {
            before = iti.getNumber() || '';
          } catch (e) {}
          if (before.replace(/\s/g, '') === plusForm) return;
          iti.setNumber(plusForm);
        } catch (e) {}
      }, debounceMs);
    });
  }

  function countryToIso2(code) {
    if (!code || typeof code !== 'string') return 'us';
    var c = code.trim().toUpperCase();
    if (c.length === 2) return c.toLowerCase();
    return 'us';
  }

  async function getInitialCountryIso2() {
    try {
      var r = await fetch('/api/locale-hint');
      var d = await r.json();
      return countryToIso2(d.country || 'US');
    } catch (e) {
      return 'us';
    }
  }

  /**
   * @param {string|NodeList|HTMLElement[]} selectorOrNodes - e.g. '#mobile' or [input1, input2]
   */
  global.initIntlPhoneInputs = async function (selectorOrNodes) {
    if (typeof intlTelInput === 'undefined') {
      console.warn('intlTelInput: load intlTelInput.min.js before intl-phone.js');
      return;
    }
    var ic = await getInitialCountryIso2();
    var nodes;
    if (typeof selectorOrNodes === 'string') {
      nodes = document.querySelectorAll(selectorOrNodes);
    } else if (selectorOrNodes && selectorOrNodes.length !== undefined) {
      nodes = selectorOrNodes;
    } else {
      return;
    }
    for (var i = 0; i < nodes.length; i++) {
      var input = nodes[i];
      if (!input || input.nodeName !== 'INPUT' || input.dataset.intlPhoneReady) continue;
      input.dataset.intlPhoneReady = '1';
      var iti = intlTelInput(input, {
        initialCountry: ic,
        preferredCountries: ['ir', 'pk', 'gb', 'ae', 'us', 'de', 'fr'],
        /** One field: +country code and number appear inside the input (not beside it). */
        separateDialCode: false,
        utilsScript: UTILS,
        formatOnDisplay: true,
        nationalMode: false,
        autoPlaceholder: 'off'
      });
      instances.set(input, iti);
      attachDoubleZeroToPlusHandler(iti, input);
    }
  };

  global.getIntlPhoneE164 = function (input) {
    if (!input) return '';
    var iti = instances.get(input);
    if (!iti) return normalizeLeadingIntlPrefix(String(input.value || '').trim());
    try {
      var n = iti.getNumber();
      if (n) return n;
    } catch (e) {}
    return normalizeLeadingIntlPrefix(String(input.value || '').trim());
  };

  global.setIntlPhoneNumber = function (input, e164OrRaw) {
    if (!input) return;
    var iti = instances.get(input);
    var v = (e164OrRaw && String(e164OrRaw).trim()) || '';
    v = normalizeLeadingIntlPrefix(v);
    if (iti && v) {
      try {
        iti.setNumber(v);
        return;
      } catch (e) {}
    }
    input.value = v;
  };

  /**
   * @param {HTMLInputElement} input
   * @param {{ optionalEmpty?: boolean }} opts - if true, empty field counts as valid
   * @returns {{ ok: boolean, code?: string }} code: empty | no_country_code | invalid_format | invalid_number
   */
  global.getIntlPhoneValidationDetail = function (input, opts) {
    opts = opts || {};
    if (!input) return { ok: false, code: 'empty' };
    var trimmed = String(input.value || '').trim();
    if (opts.optionalEmpty && !trimmed.replace(/\s/g, '')) return { ok: true };

    if (!trimmed.replace(/\s/g, '')) return { ok: false, code: 'empty' };

    var iti = instances.get(input);
    var raw = '';
    if (iti) {
      try {
        var n = iti.getNumber();
        if (n) raw = normalizeLeadingIntlPrefix(n);
      } catch (e) {}
    }
    if (!raw) raw = normalizeLeadingIntlPrefix(trimmed);

    if (!raw || raw.charAt(0) !== '+') {
      return { ok: false, code: 'no_country_code' };
    }

    if (!/^\+[1-9]\d{7,14}$/.test(raw)) {
      return { ok: false, code: 'invalid_format' };
    }

    if (iti && typeof intlTelInputUtils !== 'undefined' && iti.isValidNumber) {
      try {
        if (iti.isValidNumber()) return { ok: true };
        return { ok: false, code: 'invalid_number' };
      } catch (e) {
        return { ok: true };
      }
    }

    return { ok: true };
  };

  /** Maps validation code to message keys used by pages (en/fa in HTML). */
  global.intlPhoneMessageKey = function (code) {
    var map = {
      empty: 'phoneErrorEmpty',
      no_country_code: 'phoneErrorCountry',
      invalid_format: 'phoneErrorFormat',
      invalid_number: 'phoneErrorInvalid'
    };
    return map[code] || 'phoneErrorInvalid';
  };

  global.isIntlPhoneValidLenient = function (input, opts) {
    return global.getIntlPhoneValidationDetail(input, opts).ok;
  };
})(typeof window !== 'undefined' ? window : this);
