/**
 * International phone fields (intl-tel-input). Load intlTelInput.min.css + intl-phone.css + intlTelInput.min.js before this file.
 * Uses /api/locale-hint country for initial dial code (e.g. IR → +98, PK → +92).
 */
(function (global) {
  var ITI_VER = '19.5.6';
  var UTILS = 'https://cdn.jsdelivr.net/npm/intl-tel-input@' + ITI_VER + '/build/js/utils.js';

  var instances = new WeakMap();

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
        separateDialCode: true,
        utilsScript: UTILS,
        formatOnDisplay: true,
        nationalMode: true,
        autoPlaceholder: 'polite'
      });
      instances.set(input, iti);
    }
  };

  global.getIntlPhoneE164 = function (input) {
    if (!input) return '';
    var iti = instances.get(input);
    if (!iti) return String(input.value || '').trim();
    try {
      var n = iti.getNumber();
      if (n) return n;
    } catch (e) {}
    return String(input.value || '').trim();
  };

  global.setIntlPhoneNumber = function (input, e164OrRaw) {
    if (!input) return;
    var iti = instances.get(input);
    var v = (e164OrRaw && String(e164OrRaw).trim()) || '';
    if (iti && v) {
      try {
        iti.setNumber(v);
        return;
      } catch (e) {}
    }
    input.value = v;
  };

  /** True if utils loaded and number validates; if utils not ready, falls back to loose E.164 / legacy IR check. */
  global.isIntlPhoneValidLenient = function (input) {
    if (!input) return false;
    var iti = instances.get(input);
    var raw = global.getIntlPhoneE164(input).replace(/\s/g, '');
    if (iti) {
      try {
        if (typeof intlTelInputUtils !== 'undefined' && iti.isValidNumber && iti.isValidNumber()) {
          return true;
        }
      } catch (e) {}
    }
    if (/^\+[1-9]\d{7,14}$/.test(raw)) return true;
    if (/^(\+98|0|0098)?9\d{9}$/.test(raw)) return true;
    return false;
  };
})(typeof window !== 'undefined' ? window : this);
