/**
 * RafSkoru — Yönetici paneli
 * apps/intake/admin/app.js
 *
 * Sade, framework'süz vanilla JS (gönüllü sayfasıyla aynı desen, bkz.
 * apps/intake/app.js). Bu dosya gönüllü sayfasını veya toplama akışını
 * HİÇ ETKİLEMEZ — ayrı bir statik dizinde yaşar (apps/intake/admin/).
 *
 * Yönetici anahtarı yalnız localStorage'da tutulur; hiçbir istek URL'sine
 * eklenmez (header olarak gönderilir), hiçbir yerde console.log'a yazılmaz.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'intake_admin_key';
  const ADMIN_KEY_HEADER = 'x-intake-admin-key';
  const LOCAL_MARKET_CHAIN_KEY = 'yerel';
  const SLOT_LABELS = { front: 'Ön yüz', ingredients: 'İçindekiler', nutrition: 'Besin tablosu' };

  const el = (id) => document.getElementById(id);
  const screens = { login: el('screen-login'), panel: el('screen-panel') };

  function showScreen(name) {
    for (const key of Object.keys(screens)) screens[key].hidden = key !== name;
    el('refreshBtn').hidden = name !== 'panel';
    el('logoutBtn').hidden = name !== 'panel';
  }

  function getAdminKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setAdminKey(key) {
    localStorage.setItem(STORAGE_KEY, key);
  }

  function clearAdminKey() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function adminFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers, { [ADMIN_KEY_HEADER]: getAdminKey() });
    return fetch(`/api/intake/admin${path}`, Object.assign({}, options, { headers }));
  }

  // ── Kategori/market etiketleri (anahtar → okunur ad) ────────────────────
  let metaCache = null;

  async function loadMeta() {
    if (metaCache) return metaCache;
    const response = await fetch('/api/intake/meta');
    metaCache = await response.json();
    return metaCache;
  }

  function labelFor(options, key) {
    return options.find((option) => option.key === key)?.label ?? key;
  }

  // ── Biçimlendirme ────────────────────────────────────────────────────────
  function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('tr-TR');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function renderEmptyRow(tbody, colSpan, text) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colSpan}">${escapeHtml(text)}</td></tr>`;
  }

  // ── Giriş ────────────────────────────────────────────────────────────────
  function initLoginScreen() {
    el('loginSubmit').addEventListener('click', () => void attemptLogin());
    el('loginKey').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') void attemptLogin();
    });
  }

  async function attemptLogin() {
    const key = el('loginKey').value.trim();
    const errorEl = el('loginError');
    errorEl.hidden = true;

    if (!key) {
      errorEl.textContent = 'Yönetici anahtarı gerekli.';
      errorEl.hidden = false;
      return;
    }

    setAdminKey(key);
    const ok = await loadPanel();
    if (!ok) {
      clearAdminKey();
    }
  }

  function bindTopbar() {
    el('refreshBtn').addEventListener('click', () => void loadPanel());
    el('logoutBtn').addEventListener('click', () => {
      clearAdminKey();
      el('loginKey').value = '';
      showScreen('login');
    });
  }

  // ── Panel yükleme ────────────────────────────────────────────────────────
  async function loadPanel() {
    const errorEl = el('loginError');
    errorEl.hidden = true;

    let statsResponse;
    try {
      statsResponse = await adminFetch('/stats');
    } catch {
      errorEl.textContent = 'Bağlantı kurulamadı, tekrar deneyin.';
      errorEl.hidden = false;
      showScreen('login');
      return false;
    }

    if (statsResponse.status === 503) {
      errorEl.textContent = 'Yönetici paneli bu sunucuda yapılandırılmamış (INTAKE_ADMIN_KEY tanımlı değil).';
      errorEl.hidden = false;
      showScreen('login');
      return false;
    }

    if (statsResponse.status === 401) {
      errorEl.textContent = 'Anahtar hatalı.';
      errorEl.hidden = false;
      showScreen('login');
      return false;
    }

    if (!statsResponse.ok) {
      errorEl.textContent = 'Veriler alınamadı, tekrar deneyin.';
      errorEl.hidden = false;
      showScreen('login');
      return false;
    }

    const statsBody = await statsResponse.json();
    const recentResponse = await adminFetch('/recent?limit=50');
    const recentBody = recentResponse.ok ? await recentResponse.json() : { submissions: [] };
    const meta = await loadMeta();

    renderTotals(statsBody.stats);
    renderVolunteerTable(statsBody.stats.volunteerBreakdown);
    renderCategoryTable(statsBody.stats.categoryBreakdown, meta.categories);
    renderMarketTable(statsBody.stats.byMarketChain, statsBody.stats.localMarketBreakdown, meta.marketChains);
    renderCityTable(statsBody.stats.byCity);
    renderRecentTable(recentBody.submissions, meta.marketChains);

    showScreen('panel');
    return true;
  }

  function renderTotals(stats) {
    const activeVolunteers = stats.volunteerBreakdown.filter((row) => row.today > 0).length;
    el('totalsRow').innerHTML = [
      { label: 'Bugün toplanan', value: stats.todaySubmissions },
      { label: 'Genel toplam', value: stats.totalSubmissions },
      { label: 'Aktif gönüllü (bugün)', value: activeVolunteers },
    ]
      .map(
        (item) =>
          `<div class="total-card"><div class="total-value">${escapeHtml(item.value)}</div><div class="total-label">${escapeHtml(item.label)}</div></div>`,
      )
      .join('');
  }

  function renderVolunteerTable(rows) {
    const tbody = el('volunteerTable').querySelector('tbody');
    if (!rows || rows.length === 0) {
      renderEmptyRow(tbody, 4, 'Henüz kayıt yok.');
      return;
    }
    tbody.innerHTML = rows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.code)}</td><td>${row.total}</td><td>${row.today}</td><td>${formatDateTime(row.lastSubmissionAt)}</td></tr>`,
      )
      .join('');
  }

  function renderCategoryTable(rows, categoryOptions) {
    const tbody = el('categoryTable').querySelector('tbody');
    if (!rows || rows.length === 0) {
      renderEmptyRow(tbody, 4, 'Henüz kayıt yok.');
      return;
    }
    tbody.innerHTML = rows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(labelFor(categoryOptions, row.category))}</td><td>${row.total}</td><td>${row.recent7d}</td><td>${row.pending}</td></tr>`,
      )
      .join('');
  }

  function renderMarketTable(byMarketChain, localMarketBreakdown, marketChainOptions) {
    const tbody = el('marketTable').querySelector('tbody');
    const rows = [];

    for (const row of byMarketChain || []) {
      if (row.key === LOCAL_MARKET_CHAIN_KEY) continue;
      rows.push({ label: labelFor(marketChainOptions, row.key), count: row.count });
    }
    for (const row of localMarketBreakdown || []) {
      rows.push({ label: `Yerel — ${row.key}`, count: row.count });
    }

    if (rows.length === 0) {
      renderEmptyRow(tbody, 2, 'Henüz kayıt yok.');
      return;
    }
    tbody.innerHTML = rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.count}</td></tr>`).join('');
  }

  function renderCityTable(rows) {
    const tbody = el('cityTable').querySelector('tbody');
    if (!rows || rows.length === 0) {
      renderEmptyRow(tbody, 2, 'Henüz kayıt yok.');
      return;
    }
    tbody.innerHTML = rows.map((row) => `<tr><td>${escapeHtml(row.key)}</td><td>${row.count}</td></tr>`).join('');
  }

  let recentSubmissionsCache = [];

  function renderRecentTable(submissions, marketChainOptions) {
    recentSubmissionsCache = submissions || [];
    const tbody = el('recentTable').querySelector('tbody');

    if (recentSubmissionsCache.length === 0) {
      renderEmptyRow(tbody, 8, 'Henüz kayıt yok.');
      return;
    }

    tbody.innerHTML = recentSubmissionsCache
      .map((submission, index) => {
        const marketLabel =
          submission.marketChain === LOCAL_MARKET_CHAIN_KEY
            ? `Yerel — ${submission.marketChainOther || '?'}`
            : labelFor(marketChainOptions, submission.marketChain);
        const photoCount = submission.photos.filter((photo) => photo.filename).length;
        // Barkodu yeniden açılmış, yarım kalan bir kayıt — fotoğrafları
        // SİLİNMEDİ, yalnız bu kayıt yerine yeni bir kayıt açıldı (bkz. görev
        // onayı, madde 4b).
        const statusLabel = submission.abandonedAt ? 'Terk edilmiş' : '';

        return `<tr data-clickable data-index="${index}">
          <td>${escapeHtml(submission.barcode)}</td>
          <td>${escapeHtml(submission.productName || '—')}</td>
          <td>${escapeHtml(submission.volunteerCode)}</td>
          <td>${escapeHtml(marketLabel)}</td>
          <td>${escapeHtml(submission.city)}</td>
          <td>${formatDateTime(submission.createdAt)}</td>
          <td>${photoCount}</td>
          <td>${escapeHtml(statusLabel)}</td>
        </tr>`;
      })
      .join('');

    for (const row of tbody.querySelectorAll('tr[data-clickable]')) {
      row.addEventListener('click', () => void openPhotoModal(recentSubmissionsCache[Number(row.dataset.index)]));
    }
  }

  // ── Fotoğraf önizleme (yalnız yönetici anahtarıyla, blob üzerinden) ──────
  async function openPhotoModal(submission) {
    const body = el('photoModalBody');
    body.innerHTML = '<p class="hint">Yükleniyor…</p>';
    el('photoModal').hidden = false;

    const withPhoto = submission.photos.filter((photo) => photo.filename);
    if (withPhoto.length === 0) {
      body.innerHTML = '<p class="hint">Bu kayıt için fotoğraf yok.</p>';
      return;
    }

    body.innerHTML = '';
    for (const photo of withPhoto) {
      const label = document.createElement('p');
      label.className = 'photo-label';
      label.textContent = SLOT_LABELS[photo.slot] || photo.slot;
      body.appendChild(label);

      try {
        const response = await adminFetch(`/photos/${encodeURIComponent(photo.filename)}`);
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        body.appendChild(img);
      } catch {
        const errorText = document.createElement('p');
        errorText.className = 'error';
        errorText.textContent = 'Fotoğraf yüklenemedi.';
        body.appendChild(errorText);
      }
    }
  }

  function bindPhotoModal() {
    el('photoModalClose').addEventListener('click', () => {
      el('photoModal').hidden = true;
    });
  }

  // ── CSV indirme (header gerektiği için doğrudan <a href> kullanılamaz) ───
  function bindExport() {
    el('exportBtn').addEventListener('click', async () => {
      const errorEl = el('exportError');
      errorEl.hidden = true;
      try {
        const response = await adminFetch('/export.csv');
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rafskoru-intake-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch {
        errorEl.textContent = 'CSV indirilemedi, tekrar deneyin.';
        errorEl.hidden = false;
      }
    });
  }

  // ── Başlangıç ─────────────────────────────────────────────────────────
  async function init() {
    initLoginScreen();
    bindTopbar();
    bindExport();
    bindPhotoModal();

    if (getAdminKey()) {
      const ok = await loadPanel();
      if (!ok) showScreen('login');
    } else {
      showScreen('login');
    }
  }

  document.addEventListener('DOMContentLoaded', () => void init());
})();
