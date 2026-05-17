'use strict';

/**
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ message?: string, allowEmptyBody?: boolean, errorCode?: string }} [options]
 * @returns {T | null}
 */
function parseBody(schema, req, res, options) {
  let raw = req.body;
  if ((raw === undefined || raw === null) && options && options.allowEmptyBody) {
    raw = {};
  }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    const payload = { error: 'JSON body required' };
    if (options && options.errorCode) payload.code = options.errorCode;
    res.status(400).json(payload);
    return null;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const payload = { error: (options && options.message) || 'Invalid request' };
    if (options && options.errorCode) payload.code = options.errorCode;
    res.status(400).json(payload);
    return null;
  }
  return result.data;
}

/**
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ message?: string }} [options]
 * @returns {T | null}
 */
function parseQuery(schema, req, res, options) {
  const raw = req.query;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    res.status(400).json({ error: 'Invalid query' });
    return null;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    res.status(400).json({ error: (options && options.message) || 'Invalid query' });
    return null;
  }
  return result.data;
}

module.exports = {
  parseBody,
  parseQuery
};
