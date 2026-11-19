/**
 * RafSkoru — Yönetici paneli: Etiket onayı sekmesi (ADR-009 §3, İş 1.5b)
 * apps/intake/admin/labels.js
 *
 * /api/label-review uçlarını yönetici anahtarıyla çağırır (anahtar app.js ile
 * aynı localStorage kaydından okunur; URL'ye eklenmez, loglanmaz).
 *
 * Güvenlik kuralları (sunucu da ayrıca denetler):
 *   - ekranda ne görünüyorsa o onaylanır; alanlar her zaman açıkça gönderilir
 *   - iki okumanın ayrıştığı her alan için onaylayan bir seçim yapmadan
 *     "Onayla" düğmesi açılmaz
 *   - içindekiler doluysa "fotoğrafla karşılaştırdım" işareti zorunludur
 *   - ürün türü açıkça seçilir ("Bilinmiyor" da bir seçimdir); addan tahmin yok
 * Bu dosya alerjen değerlendirmesi veya puan üretmez.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'intake_admin_key';
  const APPROVER_STORAGE_KEY = 'label_review_approver';
  const ADMIN_KEY_HEADER = 'x-intake-admin-key';
  const UNKNOWN_KIND = '__unknown__';

  const SLOT_LABELS = { front: 'Ön yüz', ingredients: 'İçindekiler fotoğrafı', nutrition: 'Besin tablosu fotoğrafı' };
  const STATUS_LABELS = {
    agreed: 'İki okuma uyuştu',
    disagreed: 'Okumalar ayrıştı',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
  };
  const TEXT_FIELDS = [
    { key: 'productName', label: 'Ürün adı' },
    { key: 'brand', label: 'Marka' },
    { key: 'quantityText', label: 'Net miktar' },
    { key: 'ingredientsText', label: 'İçindekiler', multiline: true },
    { key: 'ingredientsLang', label: 'İçindekiler dili (ör. tr)' },
    { key: 'allergenStatementText', label: 'Alerjen beyanı (etikette yazdığı gibi)', multiline: true },
    { key: 'traceStatementText', label: 'Eser miktar ifadesi (etikette yazdığı gibi)', multiline: true },
  ];
  const NUTRIENTS = [
    { key: 'energyKcal', label: 'Enerji (kcal)' },
    { key: 'fat', label: 'Yağ (g)' },
    { key: 'saturatedFat', label: 'Doymuş yağ (g)' },
    { key: 'carbohydrates', label: 'Karbonhidrat (g)' },
    { key: 'sugars', label: 'Şekerler (g)' },
    { key: 'fiber', label: 'Lif (g)' },
    { key: 'protein', label: 'Protein (g)' },
    { key: 'salt', label: 'Tuz (g)' },
  ];

  const el = (id) => document.getElementById(id);
  let meta = null;
  let objectUrls = [];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatDateTime(iso) {
    return iso ? new Date(iso).toLocaleString('tr-TR') : '—';
  }

  function show(value) {
    return value === null || value === undefined || value === '' ? '— (okunmadı)' : String(value);
  }

  async function labelFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers, { [ADMIN_KEY_HEADER]: localStorage.getItem(STORAGE_KEY) || '' });
    return fetch(`/api/label-review${path}`, Object.assign({}, options, { headers }));
  }

  function releaseObjectUrls() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
  }

  // ── Sekmeler ──────────────────────────────────────────────────────────────
  function selectTab(name) {
    const labels = name === 'labels';
    el('tab-labels').hidden = !labels;
    el('tab-intake').hidden = labels;
    el('tabBtnLabels').classList.toggle('active', labels);
    el('tabBtnIntake').classList.toggle('active', !labels);
    el('tabBtnLabels').setAttribute('aria-selected', String(labels));
    el('tabBtnIntake').setAttribute('aria-selected', String(!labels));
    if (labels) void loadList();
  }

  // ── Liste ─────────────────────────────────────────────────────────────────
  async function loadMetaOnce() {
    if (meta) return meta;
    const response = await labelFetch('/meta');
    if (!response.ok) throw new Error(String(response.status));
    meta = await response.json();
    return meta;
  }

  async function loadList() {
    releaseObjectUrls();
    el('labelDetailView').hidden = true;
    el('labelListView').hidden = false;
    const errorEl = el('labelListError');
    errorEl.hidden = true;
    const tbody = el('labelTable').querySelector('tbody');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Yükleniyor…</td></tr>';

    try {
      await loadMetaOnce();
      const status = el('labelStatusFilter').value;
      const response = await labelFetch(`/candidates?status=${encodeURIComponent(status)}`);
      if (response.status === 503) throw new Error('Etiket deposu veya yönetici anahtarı bu sunucuda hazır değil.');
      if (response.status === 401) throw new Error('Yönetici anahtarı hatalı.');
      if (!response.ok) throw new Error('Liste alınamadı.');
      const body = await response.json();
      renderList(body.candidates);
    } catch (err) {
      tbody.innerHTML = '';
      errorEl.textContent = err.message || 'Liste alınamadı.';
      errorEl.hidden = false;
    }
  }

  function renderList(candidates) {
    const tbody = el('labelTable').querySelector('tbody');
    if (!candidates.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Bu listede aday yok.</td></tr>';
      return;
    }
    tbody.innerHTML = candidates
      .map(
        (item) => `<tr data-clickable data-id="${escapeHtml(item.id)}">
          <td>${escapeHtml(item.barcode)}</td>
          <td>${escapeHtml(item.productName || item.brand || '—')}</td>
          <td><span class="status status-${escapeHtml(item.status)}">${escapeHtml(STATUS_LABELS[item.status] || item.status)}</span></td>
          <td>${item.flagCodes.length ? `<span class="flag-count">${item.flagCodes.length}</span>` : '—'}</td>
          <td>${item.inOffCatalog ? 'Var' : 'Yok'}</td>
        </tr>`,
      )
      .join('');
    for (const row of tbody.querySelectorAll('tr[data-clickable]')) {
      row.addEventListener('click', () => void openDetail(row.dataset.id));
    }
  }

  // ── Ayrıntı ───────────────────────────────────────────────────────────────
  async function openDetail(id) {
    releaseObjectUrls();
    el('labelListView').hidden = true;
    const view = el('labelDetailView');
    view.hidden = false;
    view.innerHTML = '<p class="hint">Yükleniyor…</p>';

    const response = await labelFetch(`/candidates/${encodeURIComponent(id)}`);
    if (!response.ok) {
      view.innerHTML = '<p class="error">Aday açılamadı.</p><button class="secondary" data-back>Listeye dön</button>';
      view.querySelector('[data-back]').addEventListener('click', () => void loadList());
      return;
    }
    const detail = await response.json();
    renderDetail(detail);
  }

  function readValue(read, key) {
    return read && read.fields ? read.fields[key] : null;
  }

  function nutrientValue(read, key) {
    const nutrition = read && read.fields ? read.fields.nutritionPer100 : null;
    return nutrition ? nutrition[key] : null;
  }

  function isDiffering(detail, key) {
    const differing = detail.candidate.differingFields || [];
    return differing.includes(key) || (key.startsWith('nutritionPer100.') && differing.includes('nutritionPer100'));
  }

  function renderDetail(detail) {
    const { candidate } = detail;
    const view = el('labelDetailView');
    const decided = candidate.status === 'approved' || candidate.status === 'rejected';
    const first = candidate.extractRead;
    const second = candidate.verifyRead;

    const flagsHtml = detail.flags.length
      ? detail.flags.map((flag) => `<div class="flag">${escapeHtml(flag.message)}</div>`).join('')
      : '<p class="hint">Uyarı yok. Yine de her alanı fotoğrafla karşılaştırın.</p>';

    const notesHtml = [first, second]
      .map((read, index) =>
        read && read.notes ? `<div class="reader-note"><strong>Okuyucu ${index + 1} notu:</strong> ${escapeHtml(read.notes)}</div>` : '',
      )
      .join('');

    const unreadable = [...new Set([...(first?.unreadableFields || []), ...(second?.unreadableFields || [])])];

    view.innerHTML = `
      <button class="secondary" data-back>← Listeye dön</button>
      <h2>${escapeHtml(readValue(first, 'productName') || readValue(second, 'productName') || 'Adsız aday')} <span class="hint">· ${escapeHtml(candidate.barcode)}</span></h2>
      <p class="hint">
        Durum: <strong>${escapeHtml(STATUS_LABELS[candidate.status] || candidate.status)}</strong> ·
        Fotoğraf kaynağı: ${escapeHtml(candidate.photoSource)} · Etiketin görüldüğü tarih: ${escapeHtml(formatDateTime(candidate.observedAt))}<br />
        OFF kataloğunda: ${detail.offCatalog ? `var (${escapeHtml(detail.offCatalog.name || 'adsız')})` : 'yok'} ·
        Güncel onaylı kayıt: ${detail.currentVerified ? `sürüm ${detail.currentVerified.version} (${escapeHtml(formatDateTime(detail.currentVerified.approvedAt))})` : 'yok'}
      </p>
      <div class="review-grid">
        <div class="review-photos" id="reviewPhotos"></div>
        <div class="review-form">
          <h3>Uyarılar</h3>
          ${flagsHtml}
          ${notesHtml}
          ${unreadable.length ? `<p class="hint">Okuyucuların okuyamadığını bildirdiği alanlar: ${escapeHtml(unreadable.join(', '))}</p>` : ''}
          ${decided ? renderDecision(candidate) : renderForm(detail)}
        </div>
      </div>`;

    view.querySelector('[data-back]').addEventListener('click', () => void loadList());
    void loadPhotos(candidate.id, detail.photos);
    if (!decided) bindForm(detail);
  }

  function renderDecision(candidate) {
    return `<div class="decision">
      <p><strong>${escapeHtml(STATUS_LABELS[candidate.status])}</strong> — ${escapeHtml(candidate.decidedBy || '?')}, ${escapeHtml(formatDateTime(candidate.decidedAt))}</p>
      ${candidate.rejectionReason ? `<p>Neden: ${escapeHtml(candidate.rejectionReason)}</p>` : ''}
      <p class="hint">Karar verilmiş aday değiştirilemez. Yeni fotoğraf yeni aday açar.</p>
    </div>`;
  }

  async function loadPhotos(id, photos) {
    const container = el('reviewPhotos');
    if (!container) return;
    if (!photos.length) {
      container.innerHTML = '<p class="hint">Fotoğraf yok.</p>';
      return;
    }
    container.innerHTML = '';
    for (const photo of photos) {
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      caption.textContent = SLOT_LABELS[photo.slot] || photo.slot;
      figure.appendChild(caption);
      try {
        const response = await labelFetch(`/candidates/${encodeURIComponent(id)}/photos/${photo.index}`);
        if (!response.ok) throw new Error(String(response.status));
        const url = URL.createObjectURL(await response.blob());
        objectUrls.push(url);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = 'Tam boy açmak için tıklayın';
        const img = document.createElement('img');
        img.src = url;
        img.alt = caption.textContent;
        link.appendChild(img);
        figure.appendChild(link);
      } catch {
        const error = document.createElement('p');
        error.className = 'error';
        error.textContent = 'Fotoğraf yüklenemedi.';
        figure.appendChild(error);
      }
      if (photo.attribution) {
        const attribution = document.createElement('p');
        attribution.className = 'hint attribution';
        attribution.textContent = photo.attribution;
        figure.appendChild(attribution);
      }
      container.appendChild(figure);
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  function choiceHtml(name, a, b) {
    return `<div class="choice" data-choice="${escapeHtml(name)}">
      <span class="choice-title">Okumalar ayrıştı — doğrusunu seçin veya elle yazın:</span>
      <label class="inline"><input type="radio" name="choice-${escapeHtml(name)}" value="1" /> Okuma 1: <code>${escapeHtml(show(a))}</code></label>
      <label class="inline"><input type="radio" name="choice-${escapeHtml(name)}" value="2" /> Okuma 2: <code>${escapeHtml(show(b))}</code></label>
      <label class="inline"><input type="radio" name="choice-${escapeHtml(name)}" value="manual" /> Elle düzelttim</label>
    </div>`;
  }

  function initialValue(a, differing) {
    if (differing) return '';
    return a === null || a === undefined ? '' : String(a);
  }

  function renderForm(detail) {
    const { candidate } = detail;
    const first = candidate.extractRead;
    const second = candidate.verifyRead;

    const textRows = TEXT_FIELDS.map((field) => {
      const differing = isDiffering(detail, field.key);
      const a = readValue(first, field.key);
      const b = readValue(second, field.key);
      const value = escapeHtml(initialValue(a, differing));
      const input = field.multiline
        ? `<textarea id="f-${field.key}" rows="${field.key === 'ingredientsText' ? 6 : 2}">${value}</textarea>`
        : `<input id="f-${field.key}" type="text" value="${value}" />`;
      return `<div class="field ${differing ? 'differing' : ''}">
        <label for="f-${field.key}">${escapeHtml(field.label)}</label>
        ${differing ? choiceHtml(field.key, a, b) : ''}
        ${input}
      </div>`;
    }).join('');

    const firstNutrition = first?.fields?.nutritionPer100 ?? null;
    const secondNutrition = second?.fields?.nutritionPer100 ?? null;
    const hasNutrition = firstNutrition !== null || secondNutrition !== null;
    const basisDiffering = isDiffering(detail, 'nutritionPer100.basis');
    const basis = basisDiffering ? '' : (firstNutrition?.basis ?? '');

    const nutrientRows = NUTRIENTS.map((nutrient) => {
      const path = `nutritionPer100.${nutrient.key}`;
      const differing = isDiffering(detail, path);
      const a = nutrientValue(first, nutrient.key);
      const b = nutrientValue(second, nutrient.key);
      return `<div class="field nutrient ${differing ? 'differing' : ''}">
        <label for="n-${nutrient.key}">${escapeHtml(nutrient.label)}</label>
        ${differing ? choiceHtml(path, a, b) : ''}
        <input id="n-${nutrient.key}" type="text" inputmode="decimal" value="${escapeHtml(initialValue(a, differing))}" />
      </div>`;
    }).join('');

    const kindOptions = meta.productKinds
      .map((kind) => `<option value="${escapeHtml(kind.key === null ? UNKNOWN_KIND : kind.key)}">${escapeHtml(kind.label)}</option>`)
      .join('');
    const declared = candidate.declaredProductKind
      ? `<p class="hint">Fotoğrafı gönderenin beyanı: ${escapeHtml(candidate.declaredProductKind)} (yalnız ipucu; seçimi siz yapın).</p>`
      : '';
    const rejectOptions = meta.rejectReasons
      .map((reason) => `<option value="${escapeHtml(reason.key)}">${escapeHtml(reason.label)}</option>`)
      .join('');

    return `
      <h3>Etiket bilgileri</h3>
      <p class="hint">Boş bırakılan alan "etikette okunmadı" olarak kaydedilir. Tahminle doldurmayın.</p>
      ${textRows}

      <h3>Besin tablosu (100 g / 100 ml)</h3>
      <label class="inline"><input type="checkbox" id="noNutrition" ${hasNutrition ? '' : 'checked'} /> Etikette besin tablosu yok / okunamıyor</label>
      <div id="nutritionBlock" ${hasNutrition ? '' : 'hidden'}>
        <div class="field ${basisDiffering ? 'differing' : ''}">
          <label for="n-basis">Tablonun birimi</label>
          ${basisDiffering ? choiceHtml('nutritionPer100.basis', firstNutrition?.basis, secondNutrition?.basis) : ''}
          <select id="n-basis">
            <option value="" ${basis === '' ? 'selected' : ''}>Okunmadı</option>
            <option value="100g" ${basis === '100g' ? 'selected' : ''}>100 g</option>
            <option value="100ml" ${basis === '100ml' ? 'selected' : ''}>100 ml</option>
          </select>
        </div>
        <div class="nutrient-grid">${nutrientRows}</div>
      </div>

      <h3>Ürün türü</h3>
      <select id="productKind"><option value="" selected>Seçin…</option>${kindOptions}</select>
      ${declared}
      <p class="hint">Türü ürünün etiketine bakarak seçin. Alkollü içecekler puanlanmaz ama alerjen uyarıları yine gösterilir.</p>

      <div id="ingredientsCheckRow" class="check-row">
        <label class="inline"><input type="checkbox" id="ingredientsChecked" /> İçindekiler listesini fotoğrafla <strong>kelime kelime</strong> karşılaştırdım.</label>
      </div>

      <label for="approvedBy">Onaylayan</label>
      <input id="approvedBy" type="text" maxlength="60" />

      <p id="approveError" class="error" hidden></p>
      <button id="approveBtn" class="primary">Onayla ve yayına al</button>

      <details class="reject-box">
        <summary>Reddet</summary>
        <label for="rejectReason">Neden</label>
        <select id="rejectReason">${rejectOptions}</select>
        <label for="rejectNote">Açıklama (isteğe bağlı; "Başka bir neden" için zorunlu)</label>
        <input id="rejectNote" type="text" maxlength="500" />
        <p id="rejectError" class="error" hidden></p>
        <button id="rejectBtn" class="danger">Reddet</button>
      </details>`;
  }

  function fieldInputFor(path) {
    if (path === 'nutritionPer100.basis') return el('n-basis');
    if (path.startsWith('nutritionPer100.')) return el(`n-${path.slice('nutritionPer100.'.length)}`);
    return el(`f-${path}`);
  }

  function bindForm(detail) {
    const { candidate } = detail;
    const first = candidate.extractRead;
    const second = candidate.verifyRead;

    const approverInput = el('approvedBy');
    approverInput.value = localStorage.getItem(APPROVER_STORAGE_KEY) || 'proje-sahibi';

    // Ayrışan alanlarda seçim, ilgili kutuyu o okumanın değeriyle doldurur.
    for (const choice of document.querySelectorAll('.choice')) {
      const path = choice.dataset.choice;
      const input = fieldInputFor(path);
      for (const radio of choice.querySelectorAll('input[type="radio"]')) {
        radio.addEventListener('change', () => {
          if (radio.value === 'manual') {
            input.focus();
            return;
          }
          const read = radio.value === '1' ? first : second;
          const value = path === 'nutritionPer100.basis'
            ? (read?.fields?.nutritionPer100?.basis ?? '')
            : path.startsWith('nutritionPer100.')
              ? nutrientValue(read, path.slice('nutritionPer100.'.length))
              : readValue(read, path);
          input.value = value === null || value === undefined ? '' : String(value);
          updateIngredientsCheck();
        });
      }
      input.addEventListener('input', () => {
        const manual = choice.querySelector('input[value="manual"]');
        if (manual) manual.checked = true;
      });
    }

    el('noNutrition').addEventListener('change', () => {
      el('nutritionBlock').hidden = el('noNutrition').checked;
    });

    const updateIngredientsCheck = () => {
      const hasIngredients = el('f-ingredientsText').value.trim().length > 0;
      el('ingredientsCheckRow').hidden = !hasIngredients;
      if (!hasIngredients) el('ingredientsChecked').checked = false;
    };
    el('f-ingredientsText').addEventListener('input', updateIngredientsCheck);
    updateIngredientsCheck();

    el('approveBtn').addEventListener('click', () => void submitApprove(detail));
    el('rejectBtn').addEventListener('click', () => void submitReject(detail));
  }

  function textOrNull(value) {
    const trimmed = String(value || '').trim();
    return trimmed.length ? trimmed : null;
  }

  function parseNumber(raw, label) {
    const text = String(raw || '').trim().replace(',', '.');
    if (!text) return null;
    if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`${label}: sayı olmalı (ör. 4,5). "<0,5" gibi kesin olmayan değerleri boş bırakın.`);
    return Number(text);
  }

  function collectFields(detail) {
    const unresolved = [...document.querySelectorAll('.choice')]
      .filter((choice) => !(el('noNutrition').checked && choice.dataset.choice.startsWith('nutritionPer100')))
      .filter((choice) => !choice.querySelector('input[type="radio"]:checked'))
      .map((choice) => choice.dataset.choice);
    if (unresolved.length) throw new Error(`Ayrışan alanlar için seçim yapın: ${unresolved.join(', ')}`);

    const fields = {};
    for (const field of TEXT_FIELDS) fields[field.key] = textOrNull(el(`f-${field.key}`).value);

    if (el('noNutrition').checked) {
      fields.nutritionPer100 = null;
    } else {
      const nutrition = { basis: el('n-basis').value || null };
      for (const nutrient of NUTRIENTS) nutrition[nutrient.key] = parseNumber(el(`n-${nutrient.key}`).value, nutrient.label);
      const anyValue = NUTRIENTS.some((nutrient) => nutrition[nutrient.key] !== null);
      fields.nutritionPer100 = anyValue || nutrition.basis ? nutrition : null;
    }
    return fields;
  }

  async function submitApprove(detail) {
    const errorEl = el('approveError');
    errorEl.hidden = true;
    const button = el('approveBtn');

    try {
      const fields = collectFields(detail);
      const kindValue = el('productKind').value;
      if (!kindValue) throw new Error('Ürün türünü seçin ("Bilinmiyor" da seçilebilir).');
      if (fields.ingredientsText && !el('ingredientsChecked').checked) {
        throw new Error('İçindekiler listesini fotoğrafla karşılaştırdığınızı işaretleyin.');
      }
      const approvedBy = textOrNull(el('approvedBy').value);
      if (!approvedBy) throw new Error('Onaylayan adı boş olamaz.');

      button.disabled = true;
      const response = await labelFetch(`/candidates/${encodeURIComponent(detail.candidate.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy,
          fields,
          productKind: kindValue === UNKNOWN_KIND ? null : kindValue,
          ingredientsChecked: el('ingredientsChecked').checked,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Onay kaydedilemedi.');

      localStorage.setItem(APPROVER_STORAGE_KEY, approvedBy);
      await loadList();
      showListMessage(`${detail.candidate.barcode} onaylandı (sürüm ${body.verified.version}).`);
    } catch (err) {
      errorEl.textContent = err.message || 'Onay kaydedilemedi.';
      errorEl.hidden = false;
      button.disabled = false;
    }
  }

  async function submitReject(detail) {
    const errorEl = el('rejectError');
    errorEl.hidden = true;
    const button = el('rejectBtn');
    try {
      const rejectedBy = textOrNull(el('approvedBy').value);
      if (!rejectedBy) throw new Error('Onaylayan adı boş olamaz.');
      button.disabled = true;
      const response = await labelFetch(`/candidates/${encodeURIComponent(detail.candidate.id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reasonCode: el('rejectReason').value, note: el('rejectNote').value }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Ret kaydedilemedi.');
      await loadList();
      showListMessage(`${detail.candidate.barcode} reddedildi.`);
    } catch (err) {
      errorEl.textContent = err.message || 'Ret kaydedilemedi.';
      errorEl.hidden = false;
      button.disabled = false;
    }
  }

  function showListMessage(text) {
    const message = document.createElement('p');
    message.className = 'success';
    message.textContent = text;
    el('labelListView').prepend(message);
    setTimeout(() => message.remove(), 6000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    el('tabBtnIntake').addEventListener('click', () => selectTab('intake'));
    el('tabBtnLabels').addEventListener('click', () => selectTab('labels'));
    el('labelStatusFilter').addEventListener('change', () => void loadList());
  });
})();
