(function () {
  const banner = document.getElementById('admin-banner');
  const gate = document.getElementById('admin-gate');
  const panel = document.getElementById('admin-panel');
  const select = document.getElementById('admin-product-select');
  const categorySelect = document.getElementById('field-category');
  const newProductCategorySelect = document.getElementById('new-product-category');
  const form = document.getElementById('admin-edit-form');
  const preview = document.getElementById('admin-preview');
  const gotoLogin = document.getElementById('admin-goto-login');
  const sourceEl = document.getElementById('admin-source');
  const uploadBtn = document.getElementById('admin-upload-btn');
  const fileInput = document.getElementById('field-image-file');
  const categoryOrderUl = document.getElementById('admin-category-order');
  const exportBtn = document.getElementById('admin-export-csv-btn');
  const importFile = document.getElementById('admin-import-file');
  const importBtn = document.getElementById('admin-import-btn');
  const duplicateBtn = document.getElementById('admin-duplicate-product');
  const removeImageBtn = document.getElementById('admin-remove-image-btn');

  const addCategoryPanel = document.getElementById('add-category-panel');
  const addProductPanel = document.getElementById('add-product-panel');
  const toggleAddCategoryBtn = document.getElementById('toggle-add-category');
  const toggleAddProductBtn = document.getElementById('toggle-add-product');
  const newCategoryForm = document.getElementById('new-category-form');
  const newProductForm = document.getElementById('new-product-form');
  const deleteProductBtn = document.getElementById('admin-delete-product');
  const deleteCategoryBtn = document.getElementById('admin-delete-category');

  let dragCategoryId = null;

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

  function syncPreview(url, altText) {
    if (!url) {
      preview.classList.add('hidden');
      preview.removeAttribute('src');
      preview.alt = '';
      return;
    }
    preview.src = url;
    preview.alt = altText && String(altText).trim() ? String(altText).trim() : '';
    preview.classList.remove('hidden');
  }

  function fillForm(p) {
    document.getElementById('field-name').value = p.name || '';
    document.getElementById('field-name-fa').value = p.name_fa || '';
    document.getElementById('field-price').value = p.price != null ? String(p.price) : '';
    document.getElementById('field-category').value = p.categoryId || '';
    document.getElementById('field-desc').value = p.description || '';
    document.getElementById('field-desc-fa').value = p.description_fa || '';
    document.getElementById('field-alt-en').value = p.image_alt_en || '';
    document.getElementById('field-alt-fa').value = p.image_alt_fa || '';
    document.getElementById('field-wattage').value = p.wattage != null && p.wattage !== '' ? String(p.wattage) : '';
    document.getElementById('field-image-url').value = p.image_url || '';
    syncPreview(p.image_url, p.image_alt_en || p.name);
  }

  function selectedProduct() {
    const id = select.value;
    return flatProducts.find(function (x) {
      return x.id === id;
    });
  }

  function syncDeleteButtonState() {
    if (deleteProductBtn) deleteProductBtn.disabled = !select.value;
    if (duplicateBtn) duplicateBtn.disabled = !select.value;
    const p = selectedProduct();
    if (removeImageBtn) {
      removeImageBtn.disabled = !p || !p.image_url || !String(p.image_url).trim();
    }
  }

  function syncDeleteCategoryButtonState() {
    if (!deleteCategoryBtn) return;
    deleteCategoryBtn.disabled = !categorySelect.value || !categorySelect.options.length;
  }

  /** @param {{ id: string, name: string, name_fa?: string, sort_order?: number }[]} cats */
  function fillCategorySelectsFromCategories(cats) {
    categorySelect.innerHTML = '';
    newProductCategorySelect.innerHTML = '';
    cats.forEach(function (cat) {
      const editOpt = document.createElement('option');
      editOpt.value = cat.id;
      editOpt.textContent = cat.name + ' (' + cat.id + ')';
      categorySelect.appendChild(editOpt);

      const newOpt = document.createElement('option');
      newOpt.value = cat.id;
      newOpt.textContent = cat.name + ' (' + cat.id + ')';
      newProductCategorySelect.appendChild(newOpt);
    });
  }

  async function patchReorderFromList() {
    if (!categoryOrderUl) return;
    const ids = Array.from(categoryOrderUl.querySelectorAll('li[data-category-id]')).map(function (li) {
      return li.getAttribute('data-category-id');
    });
    if (!ids.length) return;
    const res = await fetch('/api/admin/categories/reorder', {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ orderedIds: ids })
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      showBanner(j.error || 'Could not save category order', 'error');
      return;
    }
    showBanner('Category order updated.', 'ok');
    await loadCatalog();
  }

  /** @param {{ id: string, name: string, name_fa?: string, sort_order?: number }[]} cats */
  function renderCategoryOrderList(cats) {
    if (!categoryOrderUl) return;
    categoryOrderUl.innerHTML = '';
    const sorted = [...cats].sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    sorted.forEach(function (cat) {
      const li = document.createElement('li');
      li.className = 'flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg p-2 bg-slate-50';
      li.draggable = true;
      li.dataset.categoryId = cat.id;

      const handle = document.createElement('span');
      handle.className = 'cursor-grab text-slate-400 select-none px-1';
      handle.textContent = '⠿';
      handle.title = 'Drag to reorder';

      const idSpan = document.createElement('span');
      idSpan.className = 'text-xs font-mono text-slate-600 shrink-0 max-w-[7rem] truncate';
      idSpan.textContent = cat.id;

      const nameIn = document.createElement('input');
      nameIn.type = 'text';
      nameIn.className = 'border border-slate-300 rounded px-2 py-1 text-sm flex-1 min-w-[8rem]';
      nameIn.value = cat.name || '';

      const nameFaIn = document.createElement('input');
      nameFaIn.type = 'text';
      nameFaIn.dir = 'rtl';
      nameFaIn.className = 'border border-slate-300 rounded px-2 py-1 text-sm flex-1 min-w-[8rem]';
      nameFaIn.value = cat.name_fa || '';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className =
        'px-2 py-1 rounded border border-slate-400 text-xs font-semibold hover:bg-white shrink-0';
      saveBtn.textContent = 'Save labels';
      saveBtn.addEventListener('click', async function () {
        const body = {
          name: nameIn.value.trim(),
          name_fa: nameFaIn.value.trim()
        };
        if (!body.name) {
          showBanner('English name cannot be empty when saving labels.', 'error');
          return;
        }
        const res = await fetch('/api/admin/categories/' + encodeURIComponent(cat.id), {
          method: 'PATCH',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify(body)
        });
        const j = await res.json().catch(function () {
          return {};
        });
        if (!res.ok) {
          showBanner(j.error || 'Could not update category', 'error');
          return;
        }
        showBanner('Category labels saved.', 'ok');
        await loadCatalog();
      });

      li.appendChild(handle);
      li.appendChild(idSpan);
      li.appendChild(nameIn);
      li.appendChild(nameFaIn);
      li.appendChild(saveBtn);

      li.addEventListener('dragstart', function (e) {
        dragCategoryId = cat.id;
        e.dataTransfer.effectAllowed = 'move';
        li.classList.add('opacity-60');
      });
      li.addEventListener('dragend', function () {
        dragCategoryId = null;
        li.classList.remove('opacity-60');
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      li.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragCategoryId || dragCategoryId === cat.id) return;
        const from = categoryOrderUl.querySelector('[data-category-id="' + dragCategoryId + '"]');
        if (!from || from === li) return;
        const rect = li.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (before) categoryOrderUl.insertBefore(from, li);
        else categoryOrderUl.insertBefore(from, li.nextSibling);
        patchReorderFromList();
      });

      categoryOrderUl.appendChild(li);
    });
  }

  toggleAddCategoryBtn.addEventListener('click', function () {
    addProductPanel.classList.add('hidden');
    addCategoryPanel.classList.toggle('hidden');
  });
  toggleAddProductBtn.addEventListener('click', function () {
    addCategoryPanel.classList.add('hidden');
    addProductPanel.classList.toggle('hidden');
  });

  newCategoryForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('new-category-name').value.trim();
    const nameFa = document.getElementById('new-category-name-fa').value.trim();
    const sortRaw = document.getElementById('new-category-sort').value.trim();
    const idOverride = document.getElementById('new-category-id-override').value.trim();
    const body = { name: name };
    if (nameFa) body.name_fa = nameFa;
    if (sortRaw !== '') {
      const s = parseInt(sortRaw, 10);
      if (!Number.isNaN(s)) body.sort_order = s;
    }
    if (idOverride) body.id = idOverride;

    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      showBanner(j.error || 'Could not create category', 'error');
      return;
    }
    showBanner('Category created.', 'ok');
    newCategoryForm.reset();
    await loadCatalog();
  });

  newProductForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!newProductCategorySelect.options.length) {
      showBanner('Create a category first.', 'error');
      return;
    }
    const wattVal = document.getElementById('new-product-wattage').value.trim();
    const body = {
      category_id: document.getElementById('new-product-category').value,
      name: document.getElementById('new-product-name').value.trim(),
      name_fa: document.getElementById('new-product-name-fa').value.trim(),
      price: document.getElementById('new-product-price').value
    };
    if (body.name_fa === '') delete body.name_fa;
    const img = document.getElementById('new-product-image-url').value.trim();
    if (img) body.image_url = img;
    const desc = document.getElementById('new-product-desc').value;
    if (desc) body.description = desc;
    const descFa = document.getElementById('new-product-desc-fa').value;
    if (descFa) body.description_fa = descFa;
    const altEn = document.getElementById('new-product-alt-en').value.trim();
    const altFa = document.getElementById('new-product-alt-fa').value.trim();
    if (altEn) body.image_alt_en = altEn;
    if (altFa) body.image_alt_fa = altFa;
    if (wattVal !== '') {
      const w = parseInt(wattVal, 10);
      if (!Number.isNaN(w)) body.wattage = w;
    }

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      showBanner(j.error || 'Could not create product', 'error');
      return;
    }
    showBanner('Product created.', 'ok');
    const createdId = j.product && j.product.id ? String(j.product.id) : '';
    newProductForm.reset();
    await loadCatalog();
    if (createdId) {
      select.value = createdId;
      var afterCreate = selectedProduct();
      if (afterCreate) fillForm(afterCreate);
    }
  });

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
    const catsRaw = data.categories || [];
    const cats = catsRaw.filter(function (c) {
      return !c.deleted_at;
    });
    fillCategorySelectsFromCategories(cats);
    renderCategoryOrderList(cats);
    cats.forEach(function (cat) {
      (cat.products || []).forEach(function (p) {
        if (p.deleted_at) return;
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
    } else {
      document.getElementById('field-name').value = '';
      document.getElementById('field-name-fa').value = '';
      document.getElementById('field-price').value = '';
      document.getElementById('field-category').selectedIndex =
        categorySelect.options.length ? 0 : -1;
      document.getElementById('field-desc').value = '';
      document.getElementById('field-desc-fa').value = '';
      document.getElementById('field-alt-en').value = '';
      document.getElementById('field-alt-fa').value = '';
      document.getElementById('field-wattage').value = '';
      document.getElementById('field-image-url').value = '';
      syncPreview('', '');
    }
    syncDeleteButtonState();
    syncDeleteCategoryButtonState();
  }

  select.addEventListener('change', function () {
    const p = selectedProduct();
    if (p) fillForm(p);
    syncDeleteButtonState();
    syncDeleteCategoryButtonState();
  });

  categorySelect.addEventListener('change', function () {
    syncDeleteCategoryButtonState();
  });

  document.getElementById('field-image-url').addEventListener('input', function () {
    const p = selectedProduct();
    syncPreview(this.value.trim(), p && p.image_alt_en ? p.image_alt_en : '');
  });

  document.getElementById('field-alt-en').addEventListener('input', function () {
    const url = document.getElementById('field-image-url').value.trim();
    if (url && preview && !preview.classList.contains('hidden')) {
      preview.alt = this.value.trim();
    }
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
      description_fa: document.getElementById('field-desc-fa').value,
      image_url: document.getElementById('field-image-url').value.trim(),
      image_alt_en: document.getElementById('field-alt-en').value.trim() || null,
      image_alt_fa: document.getElementById('field-alt-fa').value.trim() || null,
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
    syncDeleteButtonState();
    syncDeleteCategoryButtonState();
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
    syncPreview(j.image_url, document.getElementById('field-alt-en').value.trim());
    fileInput.value = '';
    var prevId = p.id;
    await loadCatalog();
    select.value = prevId;
    var after = selectedProduct();
    if (after) fillForm(after);
    syncDeleteButtonState();
    syncDeleteCategoryButtonState();
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      const res = await fetch('/api/admin/catalog/export.csv', { headers: Object.assign({}, authHeaders()) });
      if (!res.ok) {
        const j = await res.json().catch(function () {
          return {};
        });
        showBanner(j.error || 'Export failed', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalog-export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showBanner('Export downloaded.', 'ok');
    });
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', async function () {
      if (!importFile.files || !importFile.files[0]) {
        showBanner('Choose a CSV file first.', 'error');
        return;
      }
      const fd = new FormData();
      fd.append('file', importFile.files[0], importFile.files[0].name);
      const res = await fetch('/api/admin/catalog/import', {
        method: 'POST',
        headers: Object.assign({}, authHeaders()),
        body: fd
      });
      const j = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showBanner(j.error || 'Import failed', 'error');
        return;
      }
      const errs = j.errors && j.errors.length ? ' (' + j.errors.length + ' row errors)' : '';
      showBanner('Import finished: +' + (j.inserted || 0) + ' / ~' + (j.updated || 0) + errs, 'ok');
      importFile.value = '';
      await loadCatalog();
    });
  }

  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', async function () {
      const p = selectedProduct();
      if (!p) return;
      const res = await fetch('/api/admin/products/' + encodeURIComponent(p.id) + '/duplicate', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({})
      });
      const j = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showBanner(j.error || 'Duplicate failed', 'error');
        return;
      }
      showBanner('Product duplicated.', 'ok');
      const newId = j.product && j.product.id ? String(j.product.id) : '';
      await loadCatalog();
      if (newId) {
        select.value = newId;
        var np = selectedProduct();
        if (np) fillForm(np);
      }
      syncDeleteButtonState();
      syncDeleteCategoryButtonState();
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', async function () {
      const p = selectedProduct();
      if (!p) return;
      if (!p.image_url || !String(p.image_url).trim()) {
        showBanner('No image to remove.', 'error');
        return;
      }
      if (!confirm('Remove the stored image for this product? The image URL will be cleared.')) return;
      const res = await fetch('/api/admin/products/' + encodeURIComponent(p.id) + '/image', {
        method: 'DELETE',
        headers: Object.assign({}, authHeaders())
      });
      const j = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showBanner(j.error || 'Could not remove image', 'error');
        return;
      }
      showBanner('Image removed.', 'ok');
      const prevId = p.id;
      await loadCatalog();
      select.value = prevId;
      var after = selectedProduct();
      if (after) fillForm(after);
      syncDeleteButtonState();
      syncDeleteCategoryButtonState();
    });
  }

  if (deleteProductBtn) {
    deleteProductBtn.addEventListener('click', async function () {
      const p = selectedProduct();
      if (!p) return;
      if (!confirm('Archive product "' + (p.name || p.id) + '"? It will be hidden from the shop; use API restore or purge=hard later if needed.')) return;
      const res = await fetch('/api/admin/products/' + encodeURIComponent(p.id), {
        method: 'DELETE',
        headers: Object.assign({}, authHeaders())
      });
      const j = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showBanner(j.error || 'Delete failed', 'error');
        return;
      }
      showBanner('Product archived.', 'ok');
      await loadCatalog();
    });
  }

  if (deleteCategoryBtn) {
    deleteCategoryBtn.addEventListener('click', async function () {
      const catId = categorySelect.value;
      if (!catId) return;
      const catLabel =
        categorySelect.options[categorySelect.selectedIndex] &&
        categorySelect.options[categorySelect.selectedIndex].textContent
          ? categorySelect.options[categorySelect.selectedIndex].textContent
          : catId;
      if (
        !confirm(
          'Archive category "' +
            catLabel +
            '"?\n\nProducts in this category will be archived (hidden from the shop).\nStaff can permanently delete with purge=hard on the API if necessary.'
        )
      )
        return;
      const res = await fetch('/api/admin/categories/' + encodeURIComponent(catId), {
        method: 'DELETE',
        headers: Object.assign({}, authHeaders())
      });
      const j = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showBanner(j.error || 'Could not delete category', 'error');
        return;
      }
      showBanner('Category archived.', 'ok');
      await loadCatalog();
    });
  }

  const token = localStorage.getItem('token');
  if (!token) {
    gate.classList.remove('hidden');
    panel.classList.add('hidden');
    showBanner('Log in first (shop account).', 'error');
  } else {
    loadCatalog();
  }
})();
