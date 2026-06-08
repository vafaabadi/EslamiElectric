'use strict';

const dns = require('dns');
const https = require('https');
const { URL } = require('url');

// Prefer IPv4 on serverless (avoids intermittent ENOTFOUND / fetch failed).
dns.setDefaultResultOrder('ipv4first');

const REQUEST_TIMEOUT_MS = 30_000;
const USER_AGENT = 'eslamielectric/1.0 (server)';

class FetchHeaders {
  constructor(raw) {
    this._map = new Map();
    if (raw && typeof raw === 'object') {
      for (const [key, value] of Object.entries(raw)) {
        const v = Array.isArray(value) ? value.join(', ') : String(value);
        this._map.set(String(key).toLowerCase(), v);
      }
    }
  }

  get(name) {
    return this._map.get(String(name).toLowerCase()) ?? null;
  }

  has(name) {
    return this._map.has(String(name).toLowerCase());
  }

  forEach(callback) {
    this._map.forEach((value, key) => callback(value, key, this));
  }

  entries() {
    return this._map.entries();
  }
}

class FetchResponse {
  constructor(status, headers, body) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.headers = headers instanceof FetchHeaders ? headers : new FetchHeaders(headers);
    this._body = body;
  }

  async text() {
    return this._body;
  }

  async json() {
    return this._body ? JSON.parse(this._body) : null;
  }
}

function httpsFetch(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (err) {
      reject(err);
      return;
    }

    if (parsed.protocol !== 'https:') {
      reject(new Error('Only HTTPS URLs are supported by ipv4Fetch'));
      return;
    }

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body != null ? String(options.body) : null;
    const inputHeaders =
      options.headers && typeof options.headers.forEach === 'function'
        ? Object.fromEntries(options.headers.entries())
        : { ...(options.headers || {}) };

    const reqHeaders = {
      ...inputHeaders,
      'User-Agent': inputHeaders['User-Agent'] || USER_AGENT,
      Host: parsed.hostname
    };
    if (body != null && reqHeaders['Content-Length'] == null) {
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers: reqHeaders,
        timeout: REQUEST_TIMEOUT_MS,
        family: 4
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          resolve(new FetchResponse(res.statusCode || 0, res.headers, text));
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const err = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    });

    req.on('error', reject);

    if (body != null) req.write(body);
    req.end();
  });
}

/** fetch-compatible helper for Supabase on Vercel (IPv4 + native https). */
function ipv4Fetch(url, options) {
  return httpsFetch(url, options);
}

module.exports = { ipv4Fetch };
