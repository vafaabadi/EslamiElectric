'use strict';

const np = require('./nowpayments');
const { fulfillPaidOrder } = require('./fulfill-paid-order');

async function upsertCryptoPaymentRow(supabase, row) {
  const now = new Date().toISOString();
  const { data: existing, error: findErr } = await supabase
    .from('crypto_payments')
    .select('id')
    .eq('payment_id', row.payment_id)
    .maybeSingle();
  if (findErr) return { error: findErr };

  if (existing) {
    const { error } = await supabase
      .from('crypto_payments')
      .update({ ...row, updated_at: now })
      .eq('payment_id', row.payment_id);
    return error ? { error } : { ok: true };
  }
  const { error } = await supabase
    .from('crypto_payments')
    .insert({ ...row, created_at: now, updated_at: now });
  return error ? { error } : { ok: true };
}

function mapPaymentFields(statusPayload) {
  const status = np.normalizePaymentStatus(statusPayload);
  const payAmount =
    statusPayload.pay_amount != null
      ? String(statusPayload.pay_amount)
      : statusPayload.actually_paid != null
        ? String(statusPayload.actually_paid)
        : null;
  const payCurrency = statusPayload.pay_currency ? String(statusPayload.pay_currency) : null;
  const network = statusPayload.network ? String(statusPayload.network) : null;
  const payAddress = statusPayload.pay_address ? String(statusPayload.pay_address) : null;
  const txHash =
    statusPayload.outcome_hash ||
    statusPayload.payin_hash ||
    statusPayload.hash ||
    (statusPayload.outcome && statusPayload.outcome.hash) ||
    null;
  const invoiceUrl =
    statusPayload.invoice_url ||
    (statusPayload.invoice_id ? `https://nowpayments.io/payment/?iid=${statusPayload.invoice_id}` : null);

  return { status, payAmount, payCurrency, network, payAddress, txHash, invoiceUrl };
}

function enrichPaymentNetworkFields(mapped) {
  const info = np.getPayCurrencyInfo(mapped.payCurrency);
  return {
    ...mapped,
    network: mapped.network || info.network,
    networkLabel: info.networkLabel,
    shortLabel: info.shortLabel
  };
}

/**
 * Poll NOWPayments, sync crypto_payments + order crypto_* fields, fulfill when finished.
 */
async function syncCryptoPaymentStatus(deps, paymentId, options = {}) {
  if (!paymentId || !np.CRYPTO_PAYMENT_ID_RE.test(paymentId)) {
    return { ok: false, error: 'INVALID_PAYMENT_ID' };
  }

  let statusPayload;
  try {
    statusPayload = await np.getPaymentStatus(paymentId);
  } catch (err) {
    return {
      ok: false,
      error: 'NOWPAYMENTS_STATUS_FAILED',
      message: err.message || 'Failed to fetch payment status'
    };
  }

  const mapped = enrichPaymentNetworkFields(mapPaymentFields(statusPayload));

  const { data: order } = await deps.supabase
    .from('orders')
    .select('id, status, amount_total, currency, line_items, payment_method')
    .eq('crypto_payment_id', paymentId)
    .maybeSingle();

  if (order) {
    await deps.supabase
      .from('orders')
      .update({
        crypto_payment_status: mapped.status,
        ...(mapped.txHash ? { crypto_tx_hash: String(mapped.txHash) } : {}),
        ...(mapped.payAmount ? { crypto_pay_amount: mapped.payAmount } : {}),
        ...(mapped.payCurrency ? { crypto_pay_currency: mapped.payCurrency } : {}),
        ...(mapped.invoiceUrl ? { crypto_payment_url: mapped.invoiceUrl } : {})
      })
      .eq('id', order.id);

    await upsertCryptoPaymentRow(deps.supabase, {
      order_id: order.id,
      payment_id: paymentId,
      reference_id: order.id,
      status: mapped.status,
      amount: order.amount_total || 0,
      currency: order.currency || 'usd',
      asset: mapped.payCurrency,
      tx_hash: mapped.txHash ? String(mapped.txHash) : null,
      payment_url: mapped.invoiceUrl || mapped.payAddress,
      payment_provider: 'nowpayments',
      raw_status: statusPayload
    });
  }

  let fulfillResult = null;
  if (np.isNowPaymentsPaidStatus(mapped.status) && order && order.status === 'pending') {
    fulfillResult = await fulfillPaidOrder(deps, order.id, {
      amountTotal: order.amount_total,
      currency: order.currency || 'usd',
      lineItems: order.line_items,
      cryptoPaymentStatus: mapped.status,
      txHash: mapped.txHash ? String(mapped.txHash) : null,
      payAmount: mapped.payAmount,
      payCurrency: mapped.payCurrency,
      telegramPrefix: 'Order paid (crypto)',
      paymentRefLabel: 'NOWPayments payment',
      paymentRefValue: paymentId
    });
  }

  return {
    ok: true,
    status: mapped.status,
    isFinal: np.isNowPaymentsPaidStatus(mapped.status) || np.isNowPaymentsTerminalFailure(mapped.status),
    pollInMs: options.pollInMs != null ? options.pollInMs : 3000,
    payAddress: mapped.payAddress,
    payAmount: mapped.payAmount,
    payCurrency: mapped.payCurrency,
    network: mapped.network,
    networkLabel: mapped.networkLabel,
    invoiceUrl: mapped.invoiceUrl,
    txHash: mapped.txHash ? String(mapped.txHash) : null,
    orderStatus: fulfillResult && fulfillResult.status ? fulfillResult.status : order ? order.status : null,
    updated: !!(fulfillResult && fulfillResult.updated),
    terminalFailure: np.isNowPaymentsTerminalFailure(mapped.status)
  };
}

/**
 * Handle NOWPayments IPN webhook body (signature verified by caller).
 */
async function handleNowPaymentsIpn(deps, body) {
  const paymentId = np.normalizePaymentId(body);
  if (!paymentId || !np.CRYPTO_PAYMENT_ID_RE.test(paymentId)) {
    return { ok: false, error: 'INVALID_PAYMENT_ID' };
  }
  return syncCryptoPaymentStatus(deps, paymentId);
}

module.exports = {
  CRYPTO_PAYMENT_ID_RE: np.CRYPTO_PAYMENT_ID_RE,
  upsertCryptoPaymentRow,
  syncCryptoPaymentStatus,
  handleNowPaymentsIpn,
  mapPaymentFields,
  enrichPaymentNetworkFields
};
