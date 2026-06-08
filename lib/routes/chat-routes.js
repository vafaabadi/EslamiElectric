'use strict';

const { getChatConfig, streamChatReply } = require('../ai-chat');

/**
 * Optional JWT: attaches req.chatUser without rejecting guests.
 * @param {import('express').Request} req
 * @param {object} deps
 * @returns {Promise<object|null>}
 */
async function resolveOptionalChatUser(req, deps) {
  const { jwt, jwtSecret, supabase } = deps;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
  const { data: row, error } = await supabase
    .from('users')
    .select('email, first_name, surname, account_status')
    .eq('id', payload.userId)
    .maybeSingle();
  if (error || !row || (row.account_status && row.account_status !== 'active')) {
    return null;
  }
  return {
    userId: payload.userId,
    email: row.email || '',
    firstName: row.first_name || '',
    surname: row.surname || ''
  };
}

/**
 * @param {import('express').Express} app
 * @param {object} deps
 */
function registerChatRoutes(app, deps) {
  const { chatLimiter, parseBody, chatBodySchema, jwt, jwtSecret, supabase, getAllProducts } = deps;

  app.get('/api/chat/status', (_req, res) => {
    const config = getChatConfig();
    res.json({
      enabled: config.ok,
      model: config.ok ? config.model : null
    });
  });

  app.post('/api/chat', chatLimiter, async (req, res) => {
    const parsed = parseBody(chatBodySchema, req, res, {
      message: 'Invalid chat request'
    });
    if (!parsed) return;

    let user = null;
    try {
      user = await resolveOptionalChatUser(req, { jwt, jwtSecret, supabase });
    } catch (err) {
      console.error('POST /api/chat optional auth:', err);
    }

    await streamChatReply(req, res, {
      messages: parsed.messages,
      locale: parsed.locale,
      user,
      getAllProducts
    });
  });
}

module.exports = {
  registerChatRoutes,
  resolveOptionalChatUser
};
