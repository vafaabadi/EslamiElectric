'use strict';

const crypto = require('crypto');
const express = require('express');
const np = require('../nowpayments');
const {
  upsertCryptoPaymentRow,
  syncCryptoPaymentStatus,
  handleNowPaymentsIpn,
  mapPaymentFields,
  enrichPaymentNetworkFields,
  CRYPTO_PAYMENT_ID_RE
} = require('../crypto-checkout');

/**
 * NOWPayments IPN webhook (register before global express.json() in server.js).
 */
function registerNowPaymentsWebhook(app, deps) {
  const fulfillDeps = buildFulfillDeps(deps);

  app.post('/api/webhooks/nowpayments', express.json({ limit: '1mb' }), async (req, res) => {
    const ipnSecret = (process.env.NOWPAYMENTS_IPN_SECRET || '').trim();
    if (!ipnSecret) {
      return res.status(503).json({ error: 'NOWPayments IPN is not configured. Set NOWPAYMENTS_IPN_SECRET.' });
    }

    const sig = req.headers['x-nowpayments-sig'];
    const body = req.body;
    if (!np.verifyIpnSignature(body, sig)) {
      console.error('NOWPayments IPN signature verification failed');
      return res.status(400).json({ error: 'Invalid IPN signature' });
    }

    try {
      const result = await handleNowPaymentsIpn(fulfillDeps, body);
      if (!result.ok) {
        return res.status(400).json({ error: result.error || 'Invalid payment' });
      }
      res.json({ received: true, status: result.status, updated: !!result.updated });
    } catch (err) {
      console.error('NOWPayments IPN handler error:', err);
      res.status(500).json({ error: 'IPN processing failed' });
    }
  });
}

function buildFulfillDeps(deps) {
  return {
    supabase: deps.supabase,
    sendOrderReceiptEmail: deps.sendOrderReceiptEmail,
    sendTelegramMessage: deps.sendTelegramMessage,
    pushNotifications: deps.pushNotifications,
    baseUrl: deps.baseUrl
  };
}

/**
 * Register NOWPayments crypto checkout routes on the Express app.
 * @param {import('express').Express} app
 * @param {object} deps shared server dependencies
 */
function registerCryptoCheckoutRoutes(app, deps) {
  const {
    cryptoCheckoutLimiter,
    cryptoStatusLimiter,
    orderOpsLimiter,
    parseBody,
    createCheckoutSessionBodySchema,
    emptyJsonBodySchema,
    jwt,
    jwtSecret,
    supabase,
    getCheckoutProfileStatus,
    validationPatterns,
    isSyntheticTelegramAuthEmail,
    generateOrderNumber,
    trimDeliveryAdditionalInfo,
    ORDER_RESUME_UUID,
    baseUrl,
    sendOrderReceiptEmail,
    sendTelegramMessage,
    pushNotifications
  } = deps;

  const fulfillDeps = buildFulfillDeps(deps);

  function buildLineItemsForDb(bodyLineItems) {
    if (!Array.isArray(bodyLineItems) || bodyLineItems.length === 0) return [];
    return bodyLineItems.map((item) => {
      const pid =
        item.productId != null
          ? String(item.productId).trim()
          : item.id != null
            ? String(item.id).trim()
            : '';
      const row = {
        name: item.name || 'Item',
        quantity: item.quantity || 1,
        unit_amount: Math.round(Number(item.price) * 100),
        amount_total: Math.round(Number(item.price) * 100) * (item.quantity || 1)
      };
      if (pid) row.product_id = pid;
      return row;
    });
  }

  async function validateCheckoutBody(userId, parsed) {
    const {
      bodyLineItems,
      guestEmail,
      guestName,
      shippingAddress,
      fulfillmentType: rawFulfillment
    } = parsed;
    const fulfillmentType = rawFulfillment === 'collection' ? 'collection' : 'delivery';
    const isGuest = !userId;

    if (userId) {
      const checkout = await getCheckoutProfileStatus(userId);
      if (checkout.requiresCheckoutProfile && !checkout.complete) {
        return {
          error: {
            status: 403,
            body: {
              error:
                'Complete your profile before checkout: first name, surname, mobile, and email. Open My Profile to finish.',
              code: 'PROFILE_INCOMPLETE',
              missing: checkout.missing
            }
          }
        };
      }
    }

    if (isGuest && Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      const email = (guestEmail || '').trim().toLowerCase();
      const name = (guestName || '').trim();
      if (!email || !validationPatterns.email.test(email)) {
        return { error: { status: 400, body: { error: 'Valid email is required for guest checkout' } } };
      }
      if (!name || name.length < 2) {
        return { error: { status: 400, body: { error: 'Full name is required for guest checkout' } } };
      }
      if (fulfillmentType === 'delivery') {
        const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
        const addressLine1 =
          addr && (addr.line1 || addr.address || addr.street)
            ? String(addr.line1 || addr.address || addr.street).trim()
            : '';
        if (!addressLine1 || addressLine1.length < 5) {
          return { error: { status: 400, body: { error: 'Shipping address is required for delivery' } } };
        }
      }
    }

    if (!isGuest && userId && fulfillmentType === 'delivery' && Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      const addressLine1 =
        addr && (addr.line1 || addr.address || addr.street)
          ? String(addr.line1 || addr.address || addr.street).trim()
          : '';
      if (!addressLine1 || addressLine1.length < 5) {
        return { error: { status: 400, body: { error: 'Delivery address is required for delivery orders' } } };
      }
    }

    if (!Array.isArray(bodyLineItems) || bodyLineItems.length === 0) {
      return { error: { status: 400, body: { error: 'Basket line items are required for crypto checkout' } } };
    }

    return { fulfillmentType, isGuest };
  }

  async function resolveLoggedInCustomerEmail(userId) {
    const { data: prof } = await supabase
      .from('users')
      .select('email, contact_email')
      .eq('id', userId)
      .maybeSingle();
    if (!prof) return null;
    const authEmail = (prof.email || '').trim().toLowerCase();
    const contact = (prof.contact_email || '').trim().toLowerCase();
    const contactOk = contact && validationPatterns.email.test(contact);
    const authOk =
      authEmail && validationPatterns.email.test(authEmail) && !isSyntheticTelegramAuthEmail(authEmail);
    return contactOk ? contact : authOk ? authEmail : null;
  }

  function applyShippingToOrderRow(orderRow, fulfillmentType, shippingAddress, isGuest, userId) {
    if (fulfillmentType === 'delivery') {
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      if (addr) {
        orderRow.shipping_address = {
          line1: (addr.line1 || addr.address || addr.street || '').trim() || null,
          line2: (addr.line2 || '').trim() || null,
          city: (addr.city || '').trim() || null,
          state: (addr.state || addr.province || '').trim() || null,
          postal_code: (addr.postal_code || addr.postalCode || '').trim() || null,
          country: (addr.country || '').trim() || null
        };
        const extra = trimDeliveryAdditionalInfo(addr);
        if (extra) orderRow.shipping_address.additional_info = extra;
      }
    } else if (userId) {
      orderRow.shipping_address = null;
    }
  }

  app.get('/api/crypto-pay-currencies', async (_req, res) => {
    if (!np.isNowPaymentsConfigured()) {
      return res.status(503).json({ error: 'Crypto checkout is not configured' });
    }
    const { payCurrency } = np.getConfig();
    try {
      const currencies = await np.listAvailablePayCurrencyOptions();
      const defaultTicker = currencies.some((c) => c.payCurrency === payCurrency)
        ? payCurrency
        : currencies[0]
          ? currencies[0].payCurrency
          : payCurrency;
      res.json({
        defaultPayCurrency: defaultTicker,
        currencies: currencies.map((c) => ({
          payCurrency: c.payCurrency,
          networkLabel: c.networkLabel,
          network: c.network,
          label: c.selectorLabel
        }))
      });
    } catch (err) {
      console.error('List crypto pay currencies error:', err);
      res.status(502).json({
        error: np.formatUserFacingError(err) || 'NOWPayments: failed to load payment networks.'
      });
    }
  });

  app.post('/api/create-crypto-payment', cryptoCheckoutLimiter, async (req, res) => {
    if (!np.isNowPaymentsConfigured()) {
      return res.status(503).json({
        error: 'Crypto checkout is not configured. Set NOWPAYMENTS_API_KEY in .env'
      });
    }

    try {
      let userId = null;
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        try {
          const payload = jwt.verify(token, jwtSecret);
          userId = payload.userId;
        } catch (_) {
          return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
        }
      }

      const parsedRaw = parseBody(createCheckoutSessionBodySchema, req, res);
      if (!parsedRaw) return;
      const {
        lineItems: bodyLineItems,
        guestEmail,
        guestName,
        guestPhone,
        shippingAddress,
        locale,
        fulfillmentType: rawFulfillment,
        pendingOrderId: rawPendingOrderId,
        payCurrency: rawPayCurrency
      } = parsedRaw;
      const pendingOrderId = rawPendingOrderId != null ? String(rawPendingOrderId).trim() : '';

      const validation = await validateCheckoutBody(userId, {
        bodyLineItems,
        guestEmail,
        guestName,
        shippingAddress,
        fulfillmentType: rawFulfillment
      });
      if (validation.error) {
        return res.status(validation.error.status).json(validation.error.body);
      }
      const { fulfillmentType, isGuest } = validation;

      if (pendingOrderId) {
        if (!userId) {
          return res.status(400).json({ error: 'Sign in to update a pending order before payment.' });
        }
        if (!ORDER_RESUME_UUID.test(pendingOrderId)) {
          return res.status(400).json({ error: 'Invalid order id' });
        }
      }

      const lineItemsForDb = buildLineItemsForDb(bodyLineItems);
      const amountTotal = np.lineItemsTotalCents(bodyLineItems);
      if (amountTotal <= 0) {
        return res.status(400).json({ error: 'Order total must be greater than zero' });
      }

      const loggedInCustomerEmail = userId ? await resolveLoggedInCustomerEmail(userId) : null;

      let orderId;
      let orderNumber;
      let guestAccessToken = null;

      if (pendingOrderId) {
        const { data: existingOrder, error: exErr } = await supabase
          .from('orders')
          .select('id, order_number, status, user_id, guest_access_token')
          .eq('id', pendingOrderId)
          .eq('user_id', userId)
          .single();
        if (exErr || !existingOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }
        if (existingOrder.status !== 'pending') {
          return res.status(400).json({ error: 'This order is not pending payment.' });
        }
        orderId = existingOrder.id;
        orderNumber = existingOrder.order_number;
        guestAccessToken = existingOrder.guest_access_token;
      } else {
        orderId = crypto.randomUUID();
        orderNumber = generateOrderNumber();
        if (isGuest) {
          guestAccessToken = crypto.randomBytes(24).toString('hex');
        }
      }

      const localeSeg = locale === 'fa' ? 'fa' : 'en';
      const siteBase = baseUrl.replace(/\/$/, '');
      const successPath =
        siteBase + '/' + localeSeg + '/checkout-success?crypto_payment_id=';
      const ipnCallbackUrl = siteBase + '/api/webhooks/nowpayments';

      function buildBaseOrderRow() {
        const orderRow = {
          id: orderId,
          order_number: orderNumber,
          user_id: userId || null,
          stripe_session_id: null,
          payment_method: 'nowpayments',
          payment_provider: 'nowpayments',
          amount_total: amountTotal,
          currency: 'usd',
          status: 'pending',
          line_items: lineItemsForDb,
          fulfillment_type: fulfillmentType
        };
        if (userId && loggedInCustomerEmail) {
          orderRow.customer_email = loggedInCustomerEmail;
        }
        if (isGuest) {
          orderRow.guest_access_token = guestAccessToken;
          orderRow.customer_email = (guestEmail || '').trim().toLowerCase();
          orderRow.customer_name = (guestName || '').trim() || null;
          orderRow.customer_phone = (guestPhone || '').trim() || null;
          applyShippingToOrderRow(orderRow, fulfillmentType, shippingAddress, isGuest, userId);
        } else if (userId) {
          applyShippingToOrderRow(orderRow, fulfillmentType, shippingAddress, isGuest, userId);
        }
        return orderRow;
      }

      // Persist pending order before calling NOWPayments (same pattern as Stripe checkout).
      if (!pendingOrderId) {
        const { error: insErr } = await supabase.from('orders').insert(buildBaseOrderRow());
        if (insErr) {
          let supabaseHost = '';
          try {
            supabaseHost = new URL(String(process.env.SUPABASE_URL || '')).hostname;
          } catch (_) {
            supabaseHost = '(invalid SUPABASE_URL)';
          }
          console.error(
            'Insert crypto order error:',
            insErr.code,
            insErr.message,
            insErr.details,
            'supabaseHost:',
            supabaseHost
          );
          return res.status(500).json({
            error: np.formatOrderSaveUserError(insErr)
          });
        }
      }

      let selectedPayCurrency;
      try {
        selectedPayCurrency = np.resolvePayCurrency(rawPayCurrency);
      } catch (curErr) {
        return res.status(400).json({
          error: curErr.message || 'Invalid pay currency',
          code: curErr.code || 'INVALID_PAY_CURRENCY'
        });
      }

      try {
        const available = await np.fetchAvailablePayCurrencies();
        const enabled = np.filterPayCurrencyOptionsByAvailability(
          [np.getPayCurrencyInfo(selectedPayCurrency)],
          available
        );
        if (available.length && !enabled.length) {
          return res.status(400).json({
            error: np.formatCurrencyUnavailableError(selectedPayCurrency),
            code: 'CURRENCY_NOT_AVAILABLE',
            payCurrency: selectedPayCurrency
          });
        }
      } catch (curListErr) {
        console.warn('NOWPayments currency pre-check failed, continuing:', curListErr.message);
      }

      let payment;
      try {
        const npOpts = {
          orderId,
          amountCents: amountTotal,
          orderDescription: `Order ${orderNumber}`,
          ipnCallbackUrl,
          successUrl: successPath,
          cancelUrl: siteBase + '/' + localeSeg + '/basket',
          payCurrency: selectedPayCurrency
        };
        payment = await np.createPayment(npOpts);
        if (np.getConfig().useInvoice) {
          try {
            const invoice = await np.createInvoice(npOpts);
            payment.invoice_url = invoice.invoice_url || payment.invoice_url;
            if (!payment.payment_id && invoice.payment_id != null) {
              payment.payment_id = invoice.payment_id;
            }
          } catch (invErr) {
            console.warn('NOWPayments invoice creation failed (payment still created):', invErr.message);
          }
        }
      } catch (npErr) {
        const { baseUrl } = np.getConfig();
        const networkDetail =
          npErr.networkDetail ||
          (npErr.code === 'NOWPAYMENTS_NETWORK_ERROR'
            ? np.formatNetworkError(npErr.cause || npErr, baseUrl)
            : null);
        console.error(
          'NOWPayments create payment error:',
          npErr.code,
          npErr.status,
          npErr.message,
          networkDetail ? `detail=${networkDetail}` : '',
          `baseUrl=${baseUrl}`,
          `payCurrency=${selectedPayCurrency}`
        );
        if (npErr.body) console.error('NOWPayments create payment body:', JSON.stringify(npErr.body));
        npErr.payCurrency = selectedPayCurrency;
        const status = np.mapNowPaymentsErrorHttpStatus(npErr);
        return res.status(status).json(np.buildNowPaymentsApiErrorBody(npErr, selectedPayCurrency));
      }

      const paymentId = np.normalizePaymentId(payment);
      if (!paymentId) {
        return res.status(502).json({ error: 'NOWPayments did not return a payment id' });
      }

      const mapped = enrichPaymentNetworkFields(mapPaymentFields(payment));
      const npStatus = mapped.status;
      const payAddress = mapped.payAddress;
      const payAmount = mapped.payAmount != null ? String(mapped.payAmount) : null;
      const payCurrency = mapped.payCurrency || selectedPayCurrency;
      const networkLabel = mapped.networkLabel;
      const network = mapped.network;
      const invoiceUrl = mapped.invoiceUrl;
      const gatewayUrl = invoiceUrl || null;

      const cryptoUpdatePayload = {
        payment_method: 'nowpayments',
        payment_provider: 'nowpayments',
        crypto_payment_id: paymentId,
        crypto_payment_url: invoiceUrl || payAddress,
        crypto_payment_status: npStatus,
        crypto_pay_amount: payAmount,
        crypto_pay_currency: payCurrency,
        stripe_session_id: null,
        amount_total: amountTotal,
        currency: 'usd',
        line_items: lineItemsForDb,
        fulfillment_type: fulfillmentType
      };
      if (loggedInCustomerEmail) cryptoUpdatePayload.customer_email = loggedInCustomerEmail;
      applyShippingToOrderRow(cryptoUpdatePayload, fulfillmentType, shippingAddress, isGuest, userId);

      const { data: updatedRows, error: upErr } = await supabase
        .from('orders')
        .update(cryptoUpdatePayload)
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('id');
      if (upErr) {
        console.error('Update crypto order error:', upErr.code, upErr.message, upErr.details);
        return res.status(500).json({
          error: np.formatOrderSaveUserError(upErr)
        });
      }
      if (!updatedRows || updatedRows.length === 0) {
        return res.status(409).json({ error: 'Order is no longer pending.' });
      }

      const cryptoRowResult = await upsertCryptoPaymentRow(supabase, {
        order_id: orderId,
        payment_id: paymentId,
        reference_id: orderId,
        status: npStatus,
        amount: amountTotal,
        currency: 'usd',
        asset: payCurrency,
        tx_hash: null,
        payment_url: invoiceUrl || payAddress,
        payment_provider: 'nowpayments',
        raw_status: payment
      });
      if (cryptoRowResult && cryptoRowResult.error) {
        console.error(
          'crypto_payments upsert error:',
          cryptoRowResult.error.code,
          cryptoRowResult.error.message
        );
        return res.status(500).json({
          error: np.formatOrderSaveUserError(cryptoRowResult.error)
        });
      }

      const successUrl = successPath + encodeURIComponent(paymentId);

      res.json({
        paymentId,
        payAddress,
        payAmount,
        payCurrency,
        networkLabel,
        network,
        invoiceUrl: invoiceUrl || undefined,
        gatewayUrl: gatewayUrl || undefined,
        orderId,
        orderNumber,
        guestAccessToken: isGuest ? guestAccessToken : undefined,
        status: npStatus,
        isFinal: np.isNowPaymentsPaidStatus(npStatus),
        pollInMs: 3000,
        amountTotal,
        currency: 'usd',
        successUrl,
        payment_method: 'nowpayments'
      });
    } catch (err) {
      console.error('Create crypto payment error:', err);
      const msg =
        err && (err.code === 'NOWPAYMENTS_NETWORK_ERROR' || err.code === 'NOWPAYMENTS_HTTP_ERROR')
          ? np.formatUserFacingError(err)
          : np.formatOrderSaveUserError(err);
      res.status(500).json({ error: msg || 'Failed to create crypto payment.' });
    }
  });

  app.get('/api/crypto-payments/:id/status', cryptoStatusLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (!np.isNowPaymentsConfigured()) {
      return res.status(503).json({ error: 'Crypto checkout is not configured' });
    }
    try {
      const paymentId = String(req.params.id || '').trim();
      const result = await syncCryptoPaymentStatus(fulfillDeps, paymentId);
      if (!result.ok) {
        if (result.error === 'INVALID_PAYMENT_ID') {
          return res.status(400).json({ error: 'Invalid payment ID' });
        }
        return res.status(502).json({
          error: np.formatUserFacingError({ message: result.message }) || 'NOWPayments: failed to check payment status.'
        });
      }
      res.json(result);
    } catch (err) {
      console.error('Crypto payment status error:', err);
      res.status(500).json({
        error: np.formatUserFacingError(err) || 'NOWPayments: failed to check payment status.'
      });
    }
  });

  app.get('/api/orders/by-crypto-payment/:paymentId', async (req, res) => {
    try {
      const paymentId = String(req.params.paymentId || '').trim();
      if (!CRYPTO_PAYMENT_ID_RE.test(paymentId)) {
        return res.status(400).json({ error: 'Invalid payment ID' });
      }
      const { data: order, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, stripe_session_id, crypto_payment_id, amount_total, currency, status, line_items, customer_email, customer_name, guest_access_token, created_at, fulfillment_type, payment_method, crypto_payment_status, crypto_pay_amount, crypto_pay_currency'
        )
        .eq('crypto_payment_id', paymentId)
        .single();
      if (error || !order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      console.error('Get order by crypto payment error:', err);
      res.status(500).json({ error: 'Failed to load order' });
    }
  });

  app.post('/api/orders/confirm-by-crypto/:paymentId', orderOpsLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (!np.isNowPaymentsConfigured()) {
      return res.status(503).json({ error: 'Crypto checkout is not configured' });
    }
    try {
      const parsedConfirm = parseBody(emptyJsonBodySchema, req, res, { allowEmptyBody: true });
      if (!parsedConfirm) return;
      const paymentId = String(req.params.paymentId || '').trim();
      if (!CRYPTO_PAYMENT_ID_RE.test(paymentId)) {
        return res.status(400).json({ error: 'Invalid payment ID' });
      }

      const sync = await syncCryptoPaymentStatus(fulfillDeps, paymentId);
      if (!sync.ok) {
        return res.status(502).json({
          error: np.formatUserFacingError({ message: sync.message }) || 'NOWPayments: failed to verify payment.'
        });
      }
      if (!np.isNowPaymentsPaidStatus(sync.status)) {
        return res.status(400).json({ error: 'Payment not completed', status: sync.status });
      }

      res.json({
        updated: !!sync.updated,
        status: sync.orderStatus || 'paid',
        paymentStatus: sync.status
      });
    } catch (err) {
      console.error('Confirm by crypto error:', err);
      res.status(500).json({ error: np.formatUserFacingError(err) || 'NOWPayments: failed to confirm order.' });
    }
  });
}

module.exports = { registerCryptoCheckoutRoutes, registerNowPaymentsWebhook };
