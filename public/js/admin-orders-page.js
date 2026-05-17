(function () {
  const banner = document.getElementById('admin-orders-banner');
  const gate = document.getElementById('admin-orders-gate');
  const panel = document.getElementById('admin-orders-panel');
  const tbody = document.getElementById('admin-orders-tbody');
  const emptyOrders = document.getElementById('admin-orders-empty');
  const auditList = document.getElementById('admin-audit-list');
  const auditEmpty = document.getElementById('admin-audit-empty');
  const gotoLogin = document.getElementById('admin-goto-login');

  function showBanner(text, kind) {
    if (!String(text || '').trim() && kind === 'ok') {
      banner.textContent = '';
      banner.className = 'hidden';
      banner.classList.add('hidden');
      return;
    }
    banner.textContent = text;
    banner.className =
      'mb-2 rounded-xl border px-4 py-3 text-sm ' +
      (kind === 'error'
        ? 'border-red-300 bg-red-50 text-red-900'
        : 'border-emerald-300 bg-emerald-50 text-emerald-900');
    banner.classList.remove('hidden');
  }

  function authHeaders() {
    const t = localStorage.getItem('token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  function centsToDisplay(currency, cents) {
    const c = String(currency || 'usd').toUpperCase();
    const n = (Number(cents) || 0) / 100;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(n);
    } catch {
      return (cents / 100).toFixed(2) + ' ' + c;
    }
  }

  function isoShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace('T', ' ');
  }

  function shippingOneLine(ad) {
    if (!ad || typeof ad !== 'object') return '—';
    const parts = [ad.line1, ad.line2, ad.city, ad.postal_code, ad.country].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  async function loadAudit() {
    auditList.innerHTML = '';
    const res = await fetch('/api/admin/audit?limit=40', {
      headers: Object.assign({}, authHeaders())
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      auditEmpty.textContent = j.error || 'Could not load audit log (run migration 018?).';
      auditEmpty.classList.remove('hidden');
      return;
    }
    const entries = j.entries || [];
    auditEmpty.classList.toggle('hidden', entries.length > 0);
    entries.forEach(function (e) {
      const li = document.createElement('li');
      li.className =
        'border border-slate-100 rounded px-3 py-2 bg-slate-50 text-slate-800 flex flex-wrap gap-x-3 gap-y-1';
      var line =
        '[' +
        isoShort(e.created_at) +
        '] ' +
        String(e.action || '') +
        ' · ' +
        String(e.entity_type || '') +
        (e.entity_id ? '/' + String(e.entity_id) : '');
      line += ' · ' + String(e.actor_email || 'staff');
      li.textContent = line;
      if (e.details && typeof e.details === 'object' && Object.keys(e.details).length) {
        const pre = document.createElement('pre');
        pre.className = 'text-[11px] w-full whitespace-pre-wrap break-all text-slate-600 mt-1';
        pre.textContent = JSON.stringify(e.details, null, 0).slice(0, 420);
        li.appendChild(pre);
      }
      auditList.appendChild(li);
    });
  }

  async function patchOrder(orderId, body) {
    const res = await fetch('/api/admin/orders/' + encodeURIComponent(orderId), {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(function () {
      return {};
    });
    return { ok: res.ok, j: j };
  }

  async function renderOrders(rows) {
    tbody.innerHTML = '';
    emptyOrders.classList.toggle('hidden', !!(rows && rows.length));
    (rows || []).forEach(function (o) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 align-top';

      var tdWhen = document.createElement('td');
      tdWhen.className = 'py-2 pr-3 text-xs text-slate-600 whitespace-nowrap';
      tdWhen.textContent = isoShort(o.created_at);

      var tdId = document.createElement('td');
      tdId.className = 'py-2 pr-3 text-xs font-mono';
      tdId.textContent = String(o.order_number || o.id || '').slice(0, 32);

      var tdAmt = document.createElement('td');
      tdAmt.className = 'py-2 pr-3 whitespace-nowrap';
      tdAmt.textContent = centsToDisplay(o.currency, o.amount_total);

      var tdFul = document.createElement('td');
      tdFul.className = 'py-2 pr-3';
      var sel = document.createElement('select');
      sel.className = 'border border-slate-300 rounded px-2 py-1 text-xs bg-white max-w-[9rem]';
      ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'].forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
      });
      sel.value =
        typeof o.fulfillment_status === 'string' &&
        ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'].indexOf(o.fulfillment_status) >= 0
          ? o.fulfillment_status
          : 'unfulfilled';

      var trackInput = document.createElement('input');
      trackInput.type = 'text';
      trackInput.placeholder = 'Tracking #';
      trackInput.value = o.tracking_number != null ? String(o.tracking_number) : '';
      trackInput.className = 'border border-slate-300 rounded px-2 py-1 text-xs w-full max-w-[8rem] mt-1';

      var notesTa = document.createElement('textarea');
      notesTa.rows = 2;
      notesTa.placeholder = 'Staff notes…';
      notesTa.value = o.admin_notes != null ? String(o.admin_notes) : '';
      notesTa.className = 'border border-slate-300 rounded px-2 py-1 text-xs w-full mt-1';

      tdFul.appendChild(sel);
      tdFul.appendChild(trackInput);
      tdFul.appendChild(notesTa);

      var tdCust = document.createElement('td');
      tdCust.className = 'py-2 pr-3 text-xs max-w-[10rem] break-words';
      tdCust.textContent = (
        String(o.customer_name || '') +
        '\n' +
        String(o.customer_email || '')
      ).trim() || '—';

      var tdShip = document.createElement('td');
      tdShip.className = 'py-2 pr-3 text-xs max-w-[10rem] break-words';
      tdShip.textContent = shippingOneLine(o.shipping_address);

      var tdAct = document.createElement('td');
      tdAct.className = 'py-2 align-middle';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Save';
      btn.className = 'min-h-[40px] px-3 py-1.5 rounded bg-amber-500 text-slate-900 text-xs font-semibold hover:bg-amber-400';

      btn.addEventListener('click', async function () {
        btn.disabled = true;
        showBanner('', 'ok');
        const res = await patchOrder(o.id, {
          fulfillment_status: sel.value,
          tracking_number: trackInput.value.trim() === '' ? null : trackInput.value.trim(),
          admin_notes: notesTa.value
        });
        btn.disabled = false;
        if (!res.ok) {
          showBanner(res.j.error || 'Update failed (migration 018 on orders?).', 'error');
          return;
        }
        showBanner('Order updated.', 'ok');
        await loadAudit();
      });

      tdAct.appendChild(btn);

      tr.appendChild(tdWhen);
      tr.appendChild(tdId);
      tr.appendChild(tdAmt);
      tr.appendChild(tdFul);
      tr.appendChild(tdCust);
      tr.appendChild(tdShip);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
  }

  async function bootstrap() {
    const res = await fetch('/api/admin/orders', { headers: Object.assign({}, authHeaders()) });
    if (res.status === 401) {
      gate.classList.remove('hidden');
      panel.classList.add('hidden');
      gotoLogin.href = 'login.html';
      showBanner('Log in with an admin account.', 'error');
      return;
    }
    if (res.status === 403) {
      const j = await res.json().catch(function () {
        return {};
      });
      gate.classList.remove('hidden');
      panel.classList.add('hidden');
      showBanner(j.error || 'Access denied.', 'error');
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(function () {
        return {};
      });
      gate.classList.remove('hidden');
      panel.classList.add('hidden');
      showBanner(j.error || j.hint || 'Could not load orders.', 'error');
      return;
    }
    gate.classList.add('hidden');
    panel.classList.remove('hidden');
    gotoLogin.href = '#';
    gotoLogin.textContent = 'Log out';
    gotoLogin.onclick = function (e) {
      e.preventDefault();
      localStorage.removeItem('token');
      location.reload();
    };
    const payload = await res.json();
    await renderOrders(payload.orders || []);
    await loadAudit();
  }

  if (!localStorage.getItem('token')) {
    gate.classList.remove('hidden');
    panel.classList.add('hidden');
    showBanner('Sign in through the Catalog admin login link.', 'error');
  } else {
    bootstrap().catch(function (e) {
      showBanner((e && e.message) || 'Load failed.', 'error');
    });
  }
})();
