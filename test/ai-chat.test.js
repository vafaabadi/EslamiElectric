'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCatalogSnippet,
  buildSystemPrompt,
  getChatConfig,
  mapChatApiError,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_GATEWAY_MODEL
} = require('../lib/ai-chat');

describe('buildCatalogSnippet', () => {
  it('returns fallback when products empty', () => {
    const en = buildCatalogSnippet([], { locale: 'en' });
    assert.match(en, /unavailable/i);
    const fa = buildCatalogSnippet([], { locale: 'fa' });
    assert.match(fa, /دسترس نیست/);
  });

  it('formats product lines with price and category', () => {
    const snippet = buildCatalogSnippet(
      [
        {
          name: 'Cable 2.5mm',
          name_fa: 'کابل',
          price: 12.5,
          category: 'Cables',
          category_fa: 'کابل‌ها'
        }
      ],
      { locale: 'en' }
    );
    assert.match(snippet, /Cable 2\.5mm/);
    assert.match(snippet, /Cables/);
    assert.match(snippet, /\$12\.50 USD/);
  });
});

describe('buildSystemPrompt', () => {
  it('includes Farsi instruction for fa locale', () => {
    const prompt = buildSystemPrompt({ locale: 'fa', catalogSnippet: '- test' });
    assert.match(prompt, /فارسی/);
    assert.match(prompt, /مهمان/);
  });

  it('includes logged-in user context', () => {
    const prompt = buildSystemPrompt({
      locale: 'en',
      user: { email: 'a@b.com', firstName: 'Ali' },
      catalogSnippet: ''
    });
    assert.match(prompt, /a@b\.com/);
    assert.match(prompt, /Ali/);
  });
});

describe('getChatConfig', () => {
  const envKeys = [
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GEMINI_API_KEY',
    'AI_GATEWAY_API_KEY',
    'AI_CHAT_MODEL'
  ];

  /** @param {Record<string, string | undefined>} snapshot */
  function saveEnv(snapshot) {
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
    }
  }

  /** @param {Record<string, string | undefined>} snapshot */
  function restoreEnv(snapshot) {
    for (const key of envKeys) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  }

  /** @param {Record<string, string | undefined>} overrides */
  function withEnv(overrides, fn) {
    const snapshot = {};
    saveEnv(snapshot);
    for (const key of envKeys) {
      delete process.env[key];
    }
    Object.assign(process.env, overrides);
    try {
      return fn();
    } finally {
      restoreEnv(snapshot);
    }
  }

  it('reports disabled without any API key', () => {
    withEnv({}, () => {
      const cfg = getChatConfig();
      assert.equal(cfg.ok, false);
      assert.equal(cfg.provider, null);
    });
  });

  it('prefers Google when GOOGLE_GENERATIVE_AI_API_KEY is set', () => {
    withEnv({ GOOGLE_GENERATIVE_AI_API_KEY: 'google-key' }, () => {
      const cfg = getChatConfig();
      assert.equal(cfg.ok, true);
      assert.equal(cfg.provider, 'google');
      assert.equal(cfg.model, DEFAULT_GOOGLE_MODEL);
    });
  });

  it('uses GEMINI_API_KEY when GOOGLE_GENERATIVE_AI_API_KEY is unset', () => {
    withEnv({ GEMINI_API_KEY: 'gemini-key' }, () => {
      const cfg = getChatConfig();
      assert.equal(cfg.ok, true);
      assert.equal(cfg.provider, 'google');
      assert.equal(cfg.model, DEFAULT_GOOGLE_MODEL);
    });
  });

  it('prefers Google over gateway when both keys are set', () => {
    withEnv(
      {
        GOOGLE_GENERATIVE_AI_API_KEY: 'google-key',
        AI_GATEWAY_API_KEY: 'gateway-key'
      },
      () => {
        const cfg = getChatConfig();
        assert.equal(cfg.provider, 'google');
      }
    );
  });

  it('falls back to gateway when only AI_GATEWAY_API_KEY is set', () => {
    withEnv({ AI_GATEWAY_API_KEY: 'gateway-key' }, () => {
      const cfg = getChatConfig();
      assert.equal(cfg.ok, true);
      assert.equal(cfg.provider, 'gateway');
      assert.equal(cfg.model, DEFAULT_GATEWAY_MODEL);
    });
  });

  it('defaults to gemini-2.5-flash-lite for Google', () => {
    assert.equal(DEFAULT_GOOGLE_MODEL, 'gemini-2.5-flash-lite');
  });

  it('respects AI_CHAT_MODEL override', () => {
    withEnv(
      {
        GOOGLE_GENERATIVE_AI_API_KEY: 'google-key',
        AI_CHAT_MODEL: 'gemini-2.5-flash'
      },
      () => {
        const cfg = getChatConfig();
        assert.equal(cfg.model, 'gemini-2.5-flash');
      }
    );
  });
});

describe('mapChatApiError', () => {
  it('maps quota errors to 429', () => {
    const mapped = mapChatApiError(new Error('You exceeded your current quota (429)'));
    assert.equal(mapped.status, 429);
    assert.match(mapped.message, /quota/i);
  });

  it('maps invalid key errors to 503', () => {
    const mapped = mapChatApiError(new Error('API key not valid. Please pass a valid API key.'));
    assert.equal(mapped.status, 503);
    assert.match(mapped.message, /aistudio\.google\.com/i);
  });

  it('maps unknown model errors to 503', () => {
    const mapped = mapChatApiError(new Error('models/foo is not found for API version v1beta'));
    assert.equal(mapped.status, 503);
    assert.match(mapped.message, /model/i);
  });
});
