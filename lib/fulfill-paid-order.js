'use strict';

/**
 * Idempotent pending → paid transition with receipt email, Telegram, and push (same as Stripe success path).
 * @param {object} deps supabase, sendOrderReceiptEmail, sendTelegramMessage, pushNotifications, baseUrl
 * @param {string} orderId
 * @param {object} opts
 */
async function fulfillPaidOrder(deps, orderId, opts = {}) {
  const {
    supabase,
    sendOrderReceiptEmail,
    sendTelegramMessage,
    pushNotifications,
    baseUrl
  } = deps;

  const { data: orderBefore, error: findError } = await supabase
    .from('orders')
    .select(
      'id, status, order_number, guest_access_token, customer_name, customer_email, user_id, fulfillment_type, shipping_address, line_items, amount_total, currency, payment_method, crypto_payment_id, stripe_session_id'
    )
    .eq('id', orderId)
    .single();

  if (findError || !orderBefore) {
    return { ok: false, error: 'ORDER_NOT_FOUND' };
  }
  if (orderBefore.status === 'paid') {
    return { ok: true, updated: false, status: 'paid', order: orderBefore };
  }

  const updatePayload = {
    status: 'paid'
  };
  if (opts.amountTotal != null) updatePayload.amount_total = opts.amountTotal;
  if (opts.currency) updatePayload.currency = opts.currency;
  if (opts.lineItems) updatePayload.line_items = opts.lineItems;
  if (opts.customerEmail) updatePayload.customer_email = opts.customerEmail;
  if (opts.cryptoPaymentStatus) updatePayload.crypto_payment_status = opts.cryptoPaymentStatus;
  if (opts.txHash) updatePayload.crypto_tx_hash = opts.txHash;
  if (opts.payAmount) updatePayload.crypto_pay_amount = opts.payAmount;
  if (opts.payCurrency) updatePayload.crypto_pay_currency = opts.payCurrency;

  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    return { ok: false, error: 'UPDATE_FAILED', detail: updateError };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { ok: true, updated: false, status: 'paid', order: orderBefore };
  }

  const { data: orderForEmail } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_email, guest_access_token, customer_name, user_id, line_items, amount_total, currency, fulfillment_type, shipping_address, payment_method, crypto_payment_id, stripe_session_id'
    )
    .eq('id', orderId)
    .single();

  const siteUrl = String(baseUrl || '').replace(/\/$/, '');
  const telegramPrefix = opts.telegramPrefix || 'Order paid';
  const paymentRefLabel = opts.paymentRefLabel || 'Payment';
  const isCryptoPayment =
    orderForEmail &&
    (orderForEmail.payment_method === 'nowpayments' || orderForEmail.payment_method === 'crypto');
  const paymentRefValue =
    opts.paymentRefValue ||
    (isCryptoPayment
      ? orderForEmail.crypto_payment_id
      : orderForEmail && orderForEmail.stripe_session_id) ||
    orderId;

  if (orderForEmail && orderForEmail.customer_email) {
    sendOrderReceiptEmail(orderForEmail).catch((err) =>
      console.error('Receipt email error (fulfill-paid-order):', err)
    );
  }

  if (orderForEmail && orderForEmail.user_id) {
    pushNotifications
      .notifyOrderPaid(supabase, {
        userId: orderForEmail.user_id,
        orderId: orderForEmail.id,
        orderNumber: orderForEmail.order_number || ''
      })
      .catch((err) => console.error('Push notify order paid (fulfill-paid-order) error:', err));
  }

  if (orderForEmail) {
    const isGuest = !!orderForEmail.guest_access_token;
    const trackLink = isGuest
      ? `${siteUrl}/order.html?token=${encodeURIComponent(orderForEmail.guest_access_token)}`
      : `${siteUrl}/orders.html`;
    const items = Array.isArray(orderForEmail.line_items) ? orderForEmail.line_items : [];
    const itemsText =
      items
        .slice(0, 10)
        .map((it) => {
          const name = it.name || 'Item';
          const qty = it.quantity || 1;
          const cents = it.amount_total != null ? Number(it.amount_total) : 0;
          return `- ${name} x${qty} = $${(cents / 100).toFixed(2)}`;
        })
        .join('\n') || '- (no line items)';

    const extraShip =
      orderForEmail.shipping_address && typeof orderForEmail.shipping_address === 'object'
        ? String(orderForEmail.shipping_address.additional_info || '').trim()
        : '';
    const amountTotal = orderForEmail.amount_total != null ? Number(orderForEmail.amount_total) : 0;
    const currency = (orderForEmail.currency || 'usd').toUpperCase();

    sendTelegramMessage(
      [
        telegramPrefix,
        `Order: ${orderForEmail.order_number || orderForEmail.id}`,
        orderForEmail.customer_name ? `Customer name: ${orderForEmail.customer_name}` : null,
        `Customer email: ${orderForEmail.customer_email || (isGuest ? 'guest' : 'unknown')}`,
        `Type: ${isGuest ? 'guest' : 'registered'}`,
        `Fulfillment: ${orderForEmail.fulfillment_type === 'collection' ? 'collection' : 'delivery'}`,
        extraShip ? `Additional info: ${extraShip.slice(0, 500)}${extraShip.length > 500 ? '…' : ''}` : null,
        `Amount: $${(amountTotal / 100).toFixed(2)} ${currency}`,
        `${paymentRefLabel}: ${paymentRefValue}`,
        'Items:',
        itemsText,
        `Tracking: ${trackLink}`
      ]
        .filter(Boolean)
        .join('\n')
    ).catch((err) => console.error('Telegram fulfill-paid-order notification error:', err));
  }

  return { ok: true, updated: true, status: 'paid', order: orderForEmail || orderBefore };
}

module.exports = { fulfillPaidOrder };
