'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCatalogSnippet,
  buildSystemPrompt,
  getChatConfig,
  DEFAULT_MODEL
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
  it('reports disabled without API key', () => {
    const prev = process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    const cfg = getChatConfig();
    assert.equal(cfg.ok, false);
    if (prev) process.env.AI_GATEWAY_API_KEY = prev;
  });

  it('uses default model when key present', () => {
    const prevKey = process.env.AI_GATEWAY_API_KEY;
    const prevModel = process.env.AI_CHAT_MODEL;
    process.env.AI_GATEWAY_API_KEY = 'test-key';
    delete process.env.AI_CHAT_MODEL;
    const cfg = getChatConfig();
    assert.equal(cfg.ok, true);
    assert.equal(cfg.model, DEFAULT_MODEL);
    if (prevKey !== undefined) process.env.AI_GATEWAY_API_KEY = prevKey;
    else delete process.env.AI_GATEWAY_API_KEY;
    if (prevModel !== undefined) process.env.AI_CHAT_MODEL = prevModel;
    else delete process.env.AI_CHAT_MODEL;
  });
});
