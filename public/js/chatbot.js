(function () {
  'use strict';

  var STORAGE_KEY = 'eslami-chat-history-v1';
  var MAX_STORED = 40;
  var MAX_INPUT = 2000;

  var I18N = {
    en: {
      title: 'Eslami Electric Assistant',
      subtitle: 'Products, orders & checkout help',
      toggleLabel: 'Open AI assistant chat',
      closeLabel: 'Close chat',
      inputLabel: 'Message to assistant',
      inputPlaceholder: 'Ask about products, orders, delivery…',
      send: 'Send',
      typing: 'Assistant is typing…',
      welcome:
        'Hello! I can help with products, basket & checkout (card or crypto), delivery or collection, orders, and your account. How can I help?',
      errorGeneric: 'Something went wrong. Please try again.',
      errorRateLimit: 'Too many messages. Please wait a moment.',
      errorOffline: 'Could not reach the server. Check your connection.',
      errorDisabled: 'AI assistant is not available right now. Try WhatsApp or call us.',
      errorEmpty: 'The assistant returned no reply. The server may be out of AI quota — try again shortly.'
    },
    fa: {
      title: 'دستیار فروشگاه اسلامی الکتریک',
      subtitle: 'محصولات، سفارش و پرداخت',
      toggleLabel: 'باز کردن چت دستیار',
      closeLabel: 'بستن چت',
      inputLabel: 'پیام به دستیار',
      inputPlaceholder: 'درباره محصولات، سفارش، ارسال بپرسید…',
      send: 'ارسال',
      typing: 'در حال نوشتن…',
      welcome:
        'سلام! درباره محصولات، سبد خرید و پرداخت (کارت یا رمزارز)، ارسال یا تحویل حضوری، سفارش‌ها و حساب کاربری کمک می‌کنم. چطور می‌توانم کمک کنم؟',
      errorGeneric: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
      errorRateLimit: 'پیام‌های زیاد. لطفاً کمی صبر کنید.',
      errorOffline: 'ارتباط با سرور برقرار نشد.',
      errorDisabled: 'دستیار در دسترس نیست. از واتساپ یا تماس استفاده کنید.',
      errorEmpty: 'پاسخی دریافت نشد. ممکن است سهمیه هوش مصنوعی تمام شده باشد — کمی بعد دوباره تلاش کنید.'
    }
  };

  function getLang() {
    try {
      var stored = localStorage.getItem('lang');
      if (stored === 'en' || stored === 'fa') return stored;
    } catch (e) {}
    var p = (window.location.pathname || '').toLowerCase();
    if (p.indexOf('/fa/') === 0) return 'fa';
    if (p.indexOf('/en/') === 0) return 'en';
    return 'en';
  }

  function t(key) {
    var lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function applyDir() {
    var lang = getLang();
    if (lang === 'fa') {
      document.body.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'fa');
    } else {
      document.body.removeAttribute('dir');
      document.documentElement.setAttribute('lang', 'en');
    }
  }

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(messages) {
    try {
      var trimmed = messages.slice(-MAX_STORED);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  async function readServerError(res, fallback) {
    var contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.indexOf('application/json') !== -1) {
      try {
        var errBody = await res.json();
        if (errBody && errBody.error) return String(errBody.error);
      } catch (e1) {}
    }
    try {
      var errText = await res.text();
      if (errText && errText.trim() && errText.length < 600) return errText.trim();
    } catch (e2) {}
    return fallback;
  }

  function getAuthHeaders() {
    try {
      var token = localStorage.getItem('token');
      if (token) return { Authorization: 'Bearer ' + token };
    } catch (e) {}
    return {};
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Lightweight markdown: **bold**, [text](url), newlines */
  function formatContent(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-700 underline">$1</a>'
    );
    return safe;
  }

  var state = {
    open: false,
    busy: false,
    messages: loadHistory(),
    enabled: true
  };

  var root, panel, messagesEl, inputEl, sendBtn, toggleBtn;

  function renderMessages() {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    var list = state.messages;
    if (!list.length) {
      appendMessage('assistant', t('welcome'), true);
      return;
    }
    for (var i = 0; i < list.length; i++) {
      appendMessage(list[i].role, list[i].content, true);
    }
    scrollToBottom();
  }

  function appendMessage(role, content, skipSave) {
    var div = document.createElement('div');
    div.className =
      'eslami-chat-msg ' +
      (role === 'user'
        ? 'eslami-chat-msg-user'
        : role === 'error'
          ? 'eslami-chat-msg-error'
          : 'eslami-chat-msg-assistant');
    div.setAttribute('role', 'article');
    if (role === 'assistant') {
      div.innerHTML = formatContent(content);
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    if (!skipSave && role !== 'error') {
      state.messages.push({ role: role, content: content });
      saveHistory(state.messages);
    }
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function setBusy(busy) {
    state.busy = busy;
    if (sendBtn) sendBtn.disabled = busy;
    if (inputEl) inputEl.disabled = busy;
    var typing = document.getElementById('eslami-chat-typing');
    if (typing) typing.hidden = !busy;
  }

  function setOpen(open) {
    state.open = open;
    if (panel) panel.hidden = !open;
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (open) {
      renderMessages();
      setTimeout(function () {
        if (inputEl) inputEl.focus();
      }, 80);
    }
  }

  async function checkStatus() {
    try {
      var res = await fetch('/api/chat/status', { credentials: 'same-origin' });
      if (!res.ok) return;
      var data = await res.json();
      state.enabled = !!data.enabled;
    } catch (e) {
      state.enabled = true;
    }
  }

  async function sendMessage() {
    if (state.busy || !inputEl) return;
    var text = (inputEl.value || '').trim();
    if (!text || text.length > MAX_INPUT) return;

    if (!state.enabled) {
      appendMessage('error', t('errorDisabled'), true);
      return;
    }

    inputEl.value = '';
    appendMessage('user', text, false);

    var apiMessages = state.messages
      .filter(function (m) {
        return m.role === 'user' || m.role === 'assistant';
      })
      .map(function (m) {
        return { role: m.role, content: m.content };
      });

    setBusy(true);
    var assistantEl = appendMessage('assistant', '', true);
    var assistantText = '';

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          getAuthHeaders()
        ),
        body: JSON.stringify({
          messages: apiMessages,
          locale: getLang()
        })
      });

      if (!res.ok) {
        var errMsg = t('errorGeneric');
        if (res.status === 429) {
          errMsg = await readServerError(res, t('errorRateLimit'));
        } else if (res.status === 503) {
          errMsg = await readServerError(res, t('errorDisabled'));
        } else {
          errMsg = await readServerError(res, errMsg);
        }
        assistantEl.remove();
        appendMessage('error', errMsg, true);
        setBusy(false);
        return;
      }

      var responseType = (res.headers.get('content-type') || '').toLowerCase();
      if (responseType.indexOf('application/json') !== -1) {
        var jsonBody = await res.json();
        assistantEl.remove();
        appendMessage(
          'error',
          (jsonBody && jsonBody.error) || t('errorGeneric'),
          true
        );
        setBusy(false);
        return;
      }

      if (!res.body || !res.body.getReader) {
        assistantText = await res.text();
        if (!assistantText.trim()) {
          assistantEl.remove();
          appendMessage('error', t('errorEmpty'), true);
          setBusy(false);
          return;
        }
        assistantEl.innerHTML = formatContent(assistantText);
        state.messages.push({ role: 'assistant', content: assistantText });
        saveHistory(state.messages);
        setBusy(false);
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        assistantText += decoder.decode(chunk.value, { stream: true });
        assistantEl.innerHTML = formatContent(assistantText);
        scrollToBottom();
      }
      assistantText += decoder.decode();
      if (assistantText.trim()) {
        state.messages.push({ role: 'assistant', content: assistantText.trim() });
        saveHistory(state.messages);
      } else {
        assistantEl.remove();
        appendMessage('error', t('errorEmpty'), true);
      }
    } catch (err) {
      assistantEl.remove();
      appendMessage('error', t('errorOffline'), true);
    } finally {
      setBusy(false);
    }
  }

  function buildUi() {
    if (document.getElementById('eslami-chat-root')) return;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/chatbot.css';
    document.head.appendChild(link);

    root = document.createElement('div');
    root.id = 'eslami-chat-root';

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'eslami-chat-toggle';
    toggleBtn.setAttribute('aria-label', t('toggleLabel'));
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-controls', 'eslami-chat-panel');
    toggleBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>' +
      '</svg>';

    panel = document.createElement('div');
    panel.id = 'eslami-chat-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'eslami-chat-title');

    var header = document.createElement('div');
    header.id = 'eslami-chat-header';
    header.innerHTML =
      '<div><h2 id="eslami-chat-title"></h2><p id="eslami-chat-subtitle"></p></div>';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'eslami-chat-close';
    closeBtn.setAttribute('aria-label', t('closeLabel'));
    closeBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    header.appendChild(closeBtn);

    messagesEl = document.createElement('div');
    messagesEl.id = 'eslami-chat-messages';
    messagesEl.setAttribute('role', 'log');
    messagesEl.setAttribute('aria-live', 'polite');
    messagesEl.setAttribute('aria-relevant', 'additions');

    var typing = document.createElement('div');
    typing.id = 'eslami-chat-typing';
    typing.className = 'eslami-chat-typing';
    typing.hidden = true;
    typing.textContent = t('typing');

    var form = document.createElement('form');
    form.id = 'eslami-chat-form';
    form.setAttribute('role', 'search');

    inputEl = document.createElement('textarea');
    inputEl.id = 'eslami-chat-input';
    inputEl.rows = 1;
    inputEl.setAttribute('aria-label', t('inputLabel'));
    inputEl.placeholder = t('inputPlaceholder');
    inputEl.maxLength = MAX_INPUT;

    sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.id = 'eslami-chat-send';
    sendBtn.textContent = t('send');

    form.appendChild(inputEl);
    form.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(typing);
    panel.appendChild(form);

    root.appendChild(panel);
    root.appendChild(toggleBtn);
    document.body.appendChild(root);

    function refreshLabels() {
      document.getElementById('eslami-chat-title').textContent = t('title');
      document.getElementById('eslami-chat-subtitle').textContent = t('subtitle');
      toggleBtn.setAttribute('aria-label', t('toggleLabel'));
      closeBtn.setAttribute('aria-label', t('closeLabel'));
      inputEl.setAttribute('aria-label', t('inputLabel'));
      inputEl.placeholder = t('inputPlaceholder');
      sendBtn.textContent = t('send');
      typing.textContent = t('typing');
      applyDir();
    }

    refreshLabels();

    toggleBtn.addEventListener('click', function () {
      setOpen(!state.open);
    });

    closeBtn.addEventListener('click', function () {
      setOpen(false);
      toggleBtn.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sendMessage();
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) {
        setOpen(false);
        toggleBtn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!target) return;
      if (target.id === 'lang-en' || target.id === 'lang-fa') {
        refreshLabels();
        if (state.open) renderMessages();
      }
    });
  }

  function init() {
    applyDir();
    buildUi();
    checkStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
