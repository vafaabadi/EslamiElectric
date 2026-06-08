(function () {
  'use strict';

  var pollTimer = null;
  var activePaymentId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function clearPoll() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function formatNetworkText(template, networkLabel) {
    if (!template) return '';
    return String(template).replace(/\{network\}/g, networkLabel || '');
  }

  function hidePanel() {
    clearPoll();
    activePaymentId = null;
    var panel = $('crypto-checkout-panel');
    var qr = $('crypto-qr-wrap');
    if (panel) panel.classList.add('hidden');
    if (qr) qr.innerHTML = '';
    var quote = $('crypto-pay-quote');
    if (quote) {
      quote.textContent = '';
      quote.classList.add('hidden');
    }
    var addressEl = $('crypto-pay-address');
    if (addressEl) {
      addressEl.textContent = '';
      addressEl.classList.add('hidden');
    }
    var badgeEl = $('crypto-network-badge');
    if (badgeEl) {
      badgeEl.textContent = '';
      badgeEl.classList.add('hidden');
    }
    var warnEl = $('crypto-network-warning');
    if (warnEl) {
      warnEl.textContent = '';
      warnEl.classList.add('hidden');
    }
    var statusEl = $('crypto-status-text');
    if (statusEl) statusEl.textContent = '';
    var openBtn = $('crypto-open-invoice');
    if (openBtn) openBtn.classList.add('hidden');
  }

  function showNetworkDetails(data, t) {
    var networkLabel = data.networkLabel || data.shortLabel || '';
    var badgeEl = $('crypto-network-badge');
    if (badgeEl && networkLabel) {
      badgeEl.textContent = formatNetworkText(t.cryptoNetworkBadge || 'Network: {network}', networkLabel);
      badgeEl.classList.remove('hidden');
    }
    var warnEl = $('crypto-network-warning');
    if (warnEl && networkLabel) {
      warnEl.textContent = formatNetworkText(
        t.cryptoNetworkWarning || 'Send on {network} network only. Sending on another network may lose your funds.',
        networkLabel
      );
      warnEl.classList.remove('hidden');
    }
  }

  function showPaymentDetails(data, t) {
    var quoteEl = $('crypto-pay-quote');
    if (!quoteEl) return;

    showNetworkDetails(data, t);

    var parts = [];
    if (data.amountTotal != null) {
      parts.push((t.cryptoTotalUsd || 'Total') + ': $' + (Number(data.amountTotal) / 100).toFixed(2));
    }
    if (data.payAmount && data.payCurrency) {
      parts.push(
        (t.cryptoPayApprox || 'Send exactly') +
          ' ' +
          data.payAmount +
          ' ' +
          String(data.payCurrency).toUpperCase()
      );
    } else {
      parts.push(t.cryptoPayHint || 'Send the exact crypto amount shown to the address below.');
    }
    quoteEl.textContent = parts.join(' · ');
    quoteEl.classList.remove('hidden');

    var addressEl = $('crypto-pay-address');
    if (addressEl && data.payAddress) {
      addressEl.textContent = (t.cryptoAddressLabel || 'Pay to address') + ': ' + data.payAddress;
      addressEl.classList.remove('hidden');
    }
  }

  function renderQr(content) {
    var wrap = $('crypto-qr-wrap');
    if (!wrap || !content) return;
    wrap.innerHTML = '';
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      var canvas = document.createElement('canvas');
      canvas.setAttribute('aria-label', 'Payment QR code');
      wrap.appendChild(canvas);
      QRCode.toCanvas(canvas, content, { width: 200, margin: 1 }, function () {});
    } else {
      var img = document.createElement('img');
      img.alt = 'Payment QR code';
      img.width = 200;
      img.height = 200;
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(content);
      wrap.appendChild(img);
    }
  }

  function schedulePoll(paymentId, delayMs, onPaid, onFailed, t) {
    clearPoll();
    pollTimer = setTimeout(function () {
      pollPaymentStatus(paymentId, onPaid, onFailed, t);
    }, Math.max(1000, delayMs || 3000));
  }

  function pollPaymentStatus(paymentId, onPaid, onFailed, t) {
    if (!paymentId || paymentId !== activePaymentId) return;

    var statusEl = $('crypto-status-text');
    if (statusEl) statusEl.textContent = t.cryptoWaiting || 'Waiting for payment…';

    fetch('/api/crypto-payments/' + encodeURIComponent(paymentId) + '/status')
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, data: d };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          if (statusEl) statusEl.textContent = res.data.error || t.cryptoStatusError || 'Could not check payment status.';
          schedulePoll(paymentId, 4000, onPaid, onFailed, t);
          return;
        }

        var d = res.data;
        if (d.payAddress || d.payAmount) {
          showPaymentDetails(
            {
              payAddress: d.payAddress,
              payAmount: d.payAmount,
              payCurrency: d.payCurrency,
              networkLabel: d.networkLabel,
              shortLabel: d.shortLabel
            },
            t
          );
          if (d.payAddress) renderQr(d.payAddress);
        }

        if (d.status === 'finished' || d.orderStatus === 'paid') {
          clearPoll();
          if (statusEl) statusEl.textContent = t.cryptoPaid || 'Payment confirmed!';
          if (typeof onPaid === 'function') onPaid(paymentId, d);
          return;
        }

        if (d.terminalFailure) {
          clearPoll();
          if (statusEl) statusEl.textContent = t.cryptoFailed || 'Payment failed or expired. Try again or pay by card.';
          if (typeof onFailed === 'function') onFailed(d);
          return;
        }

        if (statusEl) {
          statusEl.textContent =
            (t.cryptoProcessing || 'Payment processing…') + (d.status ? ' (' + d.status + ')' : '');
        }
        schedulePoll(paymentId, d.pollInMs || 3000, onPaid, onFailed, t);
      })
      .catch(function () {
        if (statusEl) statusEl.textContent = t.cryptoStatusError || 'Could not check payment status.';
        schedulePoll(paymentId, 4000, onPaid, onFailed, t);
      });
  }

  function startCryptoCheckout(data, t, callbacks) {
    hidePanel();
    var panel = $('crypto-checkout-panel');
    if (panel) panel.classList.remove('hidden');

    activePaymentId = data.paymentId;
    showPaymentDetails(data, t);

    var qrContent = data.payAddress || data.invoiceUrl || data.gatewayUrl;
    if (qrContent) renderQr(qrContent);

    var openBtn = $('crypto-open-invoice');
    var invoiceUrl = data.invoiceUrl || data.gatewayUrl;
    if (openBtn && invoiceUrl) {
      openBtn.href = invoiceUrl;
      openBtn.classList.remove('hidden');
    }

    var statusEl = $('crypto-status-text');
    if (statusEl) {
      statusEl.textContent = data.payAddress
        ? t.cryptoSendHint || 'Send crypto to the address above.'
        : t.cryptoScanHint || 'Complete your crypto payment.';
    }

    schedulePoll(
      data.paymentId,
      data.pollInMs || 3000,
      callbacks && callbacks.onPaid,
      callbacks && callbacks.onFailed,
      t
    );
  }

  function bindCancel(onCancel) {
    var btn = $('crypto-cancel');
    if (!btn) return;
    btn.addEventListener('click', function () {
      hidePanel();
      if (typeof onCancel === 'function') onCancel();
    });
  }

  window.EslamiCryptoCheckout = {
    hidePanel: hidePanel,
    startCryptoCheckout: startCryptoCheckout,
    bindCancel: bindCancel,
    isActive: function () {
      return !!activePaymentId;
    }
  };
})();
