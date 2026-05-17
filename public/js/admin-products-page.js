(function () {
  const banner = document.getElementById('admin-banner');
  const gate = document.getElementById('admin-gate');
  const panel = document.getElementById('admin-panel');
  const select = document.getElementById('admin-product-select');
  const categorySelect = document.getElementById('field-category');
  const form = document.getElementById('admin-edit-form');
  const preview = document.getElementById('admin-preview');
  const gotoLogin = document.getElementById('admin-goto-login');
  const sourceEl = document.getElementById('admin-source');
  const uploadBtn = document.getElementById('admin-upload-btn');
  const fileInput = document.getElementById('field-image-file');

  function showBanner(text, kind) {
    banner.textContent = text;
    banner.classList.remove(
      'hidden',
      'border',
      'border-red-200',
      'bg-red-50',
      'text-red-800',
      'border-emerald-200',
      'bg-emerald-50',
      'text-emerald-900'
    );
    if (kind === 'error') {
      banner.classList.add('border', 'border-red-200', 'bg-red-50', 'text-red-800');
    } else {
      banner.classList.add('border', 'border-emerald-200', 'bg-emerald-50', 'text-emerald-900');
    }
    banner.classList.remove('hidden');
  }

  function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  let flatProducts = [];

  function syncPreview(url) {
    if (!url) {
      preview.classList.add('hidden');
      preview.removeAttribute('src');
      return;
    }
    preview.src = url;
    preview.classList.remove('hidden');
  }

  function fillForm(p) {
    document.getElementById('field-name').value = p.name || '';
    document.getElementById('field-name-fa').value = p.name_fa || '';
    document.getElementById('field-price').value = p.price != null ? String(p.price) : '';
    document.getElementById('field-category').value = p.categoryId || '';
    document.getElementById('field-desc').value = p.description || '';
    document.getElementById('field-wattage').value = p.wattage != null && p.wattage !== '' ? String(p.wattage) : '';
    document.getElementById('field-image-url').value = p.image_url || '';
    syncPreview(p.image_url);
  }

  function selectedProduct() {
    const id = select.value;
    return flatProducts.find(function (x) {
      return x.id === id;
    });
  }

  async function loadCatalog() {
    const res = await fetch('/api/admin/catalog', { headers: Object.assign({}, authHeaders()) });
    if (res.status === 401) {
      gotoLogin.href = 'login.html';
      gotoLogin.textContent = 'Log in';
      gotoLogin.onclick = null;
      gate.classList.remove('hidden');
      panel.classList.add('hidden');
      showBanner('Please log in with an authorised account.', 'error');
      return;
    }
    if (res.status === 403 || res.status === 503) {
      const j = await res.json().catch(function () {
        return {};
      });
      gate.classList.remove('hidden');
      panel.classList.add('hidden');
      showBanner(j.error || 'Access denied.', 'error');
      return;
    }
    if (!res.ok) {
      showBanner('Could not load catalog.', 'error');
      return;
    }
    const data = await res.json();
    sourceEl.textContent = 'Data source: ' + (data.source || 'unknown');
    gate.classList.add('hidden');
    panel.classList.remove('hidden');
    gotoLogin.href = '#';
    gotoLogin.textContent = 'Log out';
    gotoLogin.onclick = function (e) {
      e.preventDefault();
      localStorage.removeItem('token');
      location.reload();
    };

    flatProducts = [];
    select.innerHTML = '';
    categorySelect.innerHTML = '';
    (data.categories || []).forEach(function (cat) {
      const co = document.createElement('option');
      co.value = cat.id;
      co.textContent = cat.name + ' (' + cat.id + ')';
      categorySelect.appendChild(co);
      (cat.products || []).forEach(function (p) {
        flatProducts.push(
          Object.assign({}, p, {
            categoryId: cat.id,
            categoryName: cat.name
          })
        );
        const po = document.createElement('option');
        po.value = p.id;
        po.textContent = (p.name || p.id) + ' — ' + cat.name;
        select.appendChild(po);
      });
    });
    if (flatProducts.length) {
      if (!flatProducts.some(function (x) { return x.id === select.value; })) {
        select.selectedIndex = 0;
      }
      var first = selectedProduct();
      if (first) fillForm(first);
    }
  }

  select.addEventListener('change', function () {
    const p = selectedProduct();
    if (p) fillForm(p);
  });

  document.getElementById('field-image-url').addEventListener('input', function () {
    syncPreview(this.value.trim());
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const p = selectedProduct();
    if (!p) return;
    const wattVal = document.getElementById('field-wattage').value.trim();
    const body = {
      name: document.getElementById('field-name').value.trim(),
      name_fa: document.getElementById('field-name-fa').value.trim(),
      price: document.getElementById('field-price').value,
      description: document.getElementById('field-desc').value,
      image_url: document.getElementById('field-image-url').value.trim(),
      category_id: document.getElementById('field-category').value
    };
    if (wattVal === '') body.wattage = null;
    else {
      const w = parseInt(wattVal, 10);
      if (!Number.isNaN(w)) body.wattage = w;
    }
    const res = await fetch('/api/admin/products/' + encodeURIComponent(p.id), {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      showBanner(j.error || 'Save failed', 'error');
      return;
    }
    showBanner('Saved.', 'ok');
    var prevId = p.id;
    await loadCatalog();
    select.value = prevId;
    var after = selectedProduct();
    if (after) fillForm(after);
  });

  uploadBtn.addEventListener('click', async function () {
    const p = selectedProduct();
    if (!p || !fileInput.files || !fileInput.files[0]) {
      showBanner('Choose a file first.', 'error');
      return;
    }
    const fd = new FormData();
    fd.append('image', fileInput.files[0]);
    const res = await fetch('/api/admin/products/' + encodeURIComponent(p.id) + '/image', {
      method: 'POST',
      headers: Object.assign({}, authHeaders()),
      body: fd
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      showBanner(j.error || 'Upload failed', 'error');
      return;
    }
    showBanner('Image updated.', 'ok');
    document.getElementById('field-image-url').value = j.image_url || '';
    syncPreview(j.image_url);
    fileInput.value = '';
    var prevId = p.id;
    await loadCatalog();
    select.value = prevId;
    var after = selectedProduct();
    if (after) fillForm(after);
  });

  const token = localStorage.getItem('token');
  if (!token) {
    gate.classList.remove('hidden');
    panel.classList.add('hidden');
    showBanner('Log in first (shop account).', 'error');
  } else {
    loadCatalog();
  }
})();
