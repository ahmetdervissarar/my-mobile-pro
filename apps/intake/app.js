/**
 * RafSkoru — Intake gönüllü sayfası
 * apps/intake/app.js
 *
 * Sade, framework'süz vanilla JS. Backend bu dizini statik olarak sunar
 * (bkz. apps/backend/src/index.ts). GTIN doğrulaması BURADA tekrarlanmaz —
 * sunucu (GET /lookup) tek doğruluk kaynağıdır (bkz. görev onayı: mevcut
 * GTIN doğrulama kodu yeniden kullanılsın, kopyalanmasın; bu istemci ayrı
 * bir çalışma zamanı olduğundan backend'in TS modülünü import edemez).
 */
(() => {
  'use strict';

  const STORAGE_CODE = 'intake_code';
  const STORAGE_KEY = 'intake_key';
  const SESSION_CHAIN = 'intake_chain';
  const SESSION_CITY = 'intake_city';
  const SESSION_MARKET_OTHER = 'intake_market_other';
  const LOCAL_MARKET_CHAIN_KEY = 'yerel';
  // Yalnız anlık istemci geri bildirimi için — SUNUCUNUN kendi doğrulaması
  // (constants.ts, isValidLocalMarketName) tek doğruluk kaynağıdır; bu
  // istemci o TS modülünü import edemediği için kural burada aynı biçimde
  // (bilerek) tekrarlanır (bkz. dosya başı GTIN yorumu — aynı gerekçe).
  const LOCAL_MARKET_NAME_MAX_LENGTH = 60;
  const LOCAL_MARKET_NAME_PATTERN = /^[\p{L}0-9 .-]+$/u;

  const HEADER_CODE = 'x-intake-volunteer-code';
  const HEADER_KEY = 'x-intake-volunteer-key';

  const MAX_PHOTO_DIMENSION = 1600;
  const JPEG_QUALITY = 0.8;
  const SYNC_INTERVAL_MS = 15_000;

  const SLOT_LABELS = { front: 'Ön yüz', ingredients: 'İçindekiler', nutrition: 'Besin tablosu' };

  // ── DOM ────────────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);
  const screens = {
    login: el('screen-login'),
    session: el('screen-session'),
    scan: el('screen-scan'),
    result: el('screen-result'),
  };

  function showScreen(name) {
    for (const key of Object.keys(screens)) {
      screens[key].hidden = key !== name;
    }
  }

  // ── Kimlik (localStorage'da hatırlanır) ──────────────────────────────────
  function getSavedCredentials() {
    return { code: localStorage.getItem(STORAGE_CODE) || '', key: localStorage.getItem(STORAGE_KEY) || '' };
  }

  function saveCredentials(code, key) {
    localStorage.setItem(STORAGE_CODE, code);
    localStorage.setItem(STORAGE_KEY, key);
  }

  // ── Oturum (market + şehir, sessionStorage'da — sekme kapanınca biter) ───
  function getSession() {
    return {
      chain: sessionStorage.getItem(SESSION_CHAIN) || '',
      marketChainOther: sessionStorage.getItem(SESSION_MARKET_OTHER) || '',
      city: sessionStorage.getItem(SESSION_CITY) || '',
    };
  }

  function saveSession(chain, city, marketChainOther) {
    sessionStorage.setItem(SESSION_CHAIN, chain);
    sessionStorage.setItem(SESSION_CITY, city);
    if (chain === LOCAL_MARKET_CHAIN_KEY) {
      sessionStorage.setItem(SESSION_MARKET_OTHER, marketChainOther || '');
    } else {
      sessionStorage.removeItem(SESSION_MARKET_OTHER);
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_CHAIN);
    sessionStorage.removeItem(SESSION_CITY);
    sessionStorage.removeItem(SESSION_MARKET_OTHER);
  }

  function isValidLocalMarketName(name) {
    return name.length > 0 && name.length <= LOCAL_MARKET_NAME_MAX_LENGTH && LOCAL_MARKET_NAME_PATTERN.test(name);
  }

  // ── API ────────────────────────────────────────────────────────────────
  async function apiFetch(path, options = {}) {
    const { code, key } = getSavedCredentials();
    const headers = Object.assign({}, options.headers, { [HEADER_CODE]: code, [HEADER_KEY]: key });
    const response = await fetch(`/api/intake${path}`, Object.assign({}, options, { headers }));
    return response;
  }

  // ── IndexedDB kuyruğu ─────────────────────────────────────────────────
  // Her iş (job): { id (auto), barcode, marketChain, marketChainOther, city,
  //   category, clientCreatedAt, requestedSlots: string[], photos: {slot: Blob},
  //   submissionId: string|null, uploadedSlots: string[], lastError: string|null }
  const DB_NAME = 'rafskoru-intake-queue';
  const STORE_NAME = 'jobs';
  let dbPromise = null;

  function openQueueDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function queueAdd(job) {
    const db = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).add(job);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function queueGetAll() {
    const db = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function queuePut(job) {
    const db = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(job);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function queueDelete(id) {
    const db = await openQueueDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function updatePendingIndicator() {
    const jobs = await queueGetAll();
    const indicator = el('pendingIndicator');
    if (jobs.length === 0) {
      indicator.hidden = true;
      return;
    }
    indicator.hidden = false;
    indicator.textContent = `Beklemede: ${jobs.length}`;
  }

  // ── Kuyruk senkronizasyonu ────────────────────────────────────────────
  let isSyncing = false;

  async function syncQueue() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;

    try {
      const jobs = await queueGetAll();

      for (const job of jobs) {
        try {
          if (!job.submissionId) {
            const response = await apiFetch('/submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                barcode: job.barcode,
                marketChain: job.marketChain,
                marketChainOther: job.marketChainOther || undefined,
                city: job.city,
                category: job.category,
                clientCreatedAt: job.clientCreatedAt,
              }),
            });

            if (response.status === 201) {
              const body = await response.json();
              job.submissionId = body.submissionId;
              await queuePut(job);
            } else if (response.status === 409) {
              // Zaten toplanmış/tamamlanmış — bu işin yapacak bir şeyi kalmadı.
              await queueDelete(job.id);
              continue;
            } else {
              job.lastError = `submission ${response.status}`;
              await queuePut(job);
              continue;
            }
          }

          let allUploaded = true;
          for (const slot of job.requestedSlots) {
            if (job.uploadedSlots.includes(slot)) continue;
            const blob = job.photos[slot];
            if (!blob) {
              allUploaded = false;
              continue;
            }

            const uploadResponse = await apiFetch(`/submissions/${job.submissionId}/photos/${slot}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
            });

            if (uploadResponse.ok) {
              job.uploadedSlots.push(slot);
              await queuePut(job);
            } else {
              allUploaded = false;
              job.lastError = `photo ${slot} ${uploadResponse.status}`;
              await queuePut(job);
            }
          }

          if (allUploaded) {
            await queueDelete(job.id);
            void refreshProgress();
          }
        } catch (err) {
          // Ağ hatası — bu iş kuyrukta kalır, bir sonraki denemede tekrar denenir.
          job.lastError = String(err && err.message ? err.message : err);
          await queuePut(job).catch(() => {});
        }
      }
    } finally {
      isSyncing = false;
      await updatePendingIndicator();
    }
  }

  window.addEventListener('online', () => void syncQueue());
  setInterval(() => void syncQueue(), SYNC_INTERVAL_MS);

  // ── İlerleme ───────────────────────────────────────────────────────────
  async function refreshProgress() {
    try {
      const response = await apiFetch('/progress');
      if (!response.ok) return;
      const body = await response.json();
      const badge = el('progressBadge');
      badge.hidden = false;
      badge.textContent = `Bugün sen: ${body.today} ürün · toplam: ${body.totalAll}`;
    } catch {
      // Sessizce geç — ilerleme rozeti isteğe bağlı bir gösterge, akışı bloklamaz.
    }
  }

  // ── Görsel küçültme (uzun kenar 1600px, JPEG ~0.8) ──────────────────────
  function resizeImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', JPEG_QUALITY);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image load failed'));
      };
      img.src = url;
    });
  }

  // ── Barkod okuma (tek fotoğraftan, BarcodeDetector varsa) ────────────────
  // Canlı kamera akışı KULLANILMAZ — native kamera uygulaması tek bir
  // fotoğraf çeker, barkod o görüntü üzerinde okunur (bkz. görev onayı:
  // "kamera akışından değil, çekilmiş görüntüden"). Fotoğraf hiçbir zaman
  // sunucuya yüklenmez, yalnız bu okuma için istemcide kullanılır.
  function hasBarcodeDetectorSupport() {
    return 'BarcodeDetector' in window;
  }

  async function detectBarcodeFromFile(file) {
    const bitmap = await createImageBitmap(file);
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const barcodes = await detector.detect(bitmap);
    return barcodes.length > 0 ? barcodes[0].rawValue : null;
  }

  // Gözle karşılaştırma için 4'erli grupla gösterir (ör. "8690 5650 1755 5").
  function formatBarcodeForDisplay(value) {
    return String(value).replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  // ── Meta (market/şehir/kategori listeleri) ──────────────────────────────
  let metaCache = null;

  async function loadMeta() {
    if (metaCache) return metaCache;
    const response = await fetch('/api/intake/meta');
    metaCache = await response.json();
    return metaCache;
  }

  function fillSelect(selectEl, options) {
    selectEl.innerHTML = '';
    for (const option of options) {
      const optionEl = document.createElement('option');
      optionEl.value = option.key;
      optionEl.textContent = option.label;
      selectEl.appendChild(optionEl);
    }
  }

  // ── Ekran: Giriş ─────────────────────────────────────────────────────────
  function initLoginScreen() {
    const saved = getSavedCredentials();
    if (saved.code) el('loginCode').value = saved.code;

    el('loginSubmit').addEventListener('click', async () => {
      const code = el('loginCode').value.trim();
      const key = el('loginKey').value.trim();
      const errorEl = el('loginError');
      errorEl.hidden = true;

      if (!code || !key) {
        errorEl.textContent = 'Gönüllü kodu ve anahtar gerekli.';
        errorEl.hidden = false;
        return;
      }

      try {
        const response = await fetch('/api/intake/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, key }),
        });

        if (!response.ok) {
          errorEl.textContent = 'Kod veya anahtar hatalı.';
          errorEl.hidden = false;
          return;
        }

        saveCredentials(code, key);
        await proceedAfterLogin();
      } catch {
        errorEl.textContent = 'Bağlantı kurulamadı, tekrar deneyin.';
        errorEl.hidden = false;
      }
    });
  }

  async function proceedAfterLogin() {
    void refreshProgress();
    const session = getSession();
    if (session.chain && session.city) {
      showScreen('scan');
    } else {
      await initSessionScreen();
      showScreen('session');
    }
  }

  // ── Ekran: Oturum (market + şehir) ───────────────────────────────────────
  async function initSessionScreen() {
    const meta = await loadMeta();
    fillSelect(el('sessionChain'), meta.marketChains);
    fillSelect(el('sessionCity'), meta.cities);
    el('localMarketNameWrap').hidden = el('sessionChain').value !== LOCAL_MARKET_CHAIN_KEY;
    el('localMarketName').value = '';
    el('sessionError').hidden = true;
  }

  function bindSessionScreen() {
    el('sessionChain').addEventListener('change', () => {
      el('localMarketNameWrap').hidden = el('sessionChain').value !== LOCAL_MARKET_CHAIN_KEY;
    });

    el('sessionSubmit').addEventListener('click', () => {
      const chain = el('sessionChain').value;
      const city = el('sessionCity').value;
      const errorEl = el('sessionError');
      errorEl.hidden = true;

      let marketChainOther = '';
      if (chain === LOCAL_MARKET_CHAIN_KEY) {
        marketChainOther = el('localMarketName').value.trim();
        if (!isValidLocalMarketName(marketChainOther)) {
          errorEl.textContent =
            'Market adı gerekli — yalnız harf, rakam, boşluk, nokta ve tire, en fazla 60 karakter.';
          errorEl.hidden = false;
          return;
        }
      }

      saveSession(chain, city, marketChainOther);
      renderSessionInfo();
      showScreen('scan');
    });

    el('changeSessionBtn').addEventListener('click', async () => {
      clearSession();
      await initSessionScreen();
      showScreen('session');
    });
  }

  function renderSessionInfo() {
    const session = getSession();
    const { code } = getSavedCredentials();
    const marketLabel = session.chain === LOCAL_MARKET_CHAIN_KEY ? session.marketChainOther : session.chain;
    el('sessionInfoText').textContent = `${code} · ${marketLabel} · ${session.city}`;
  }

  // ── Ekran: Barkod çekme/onay/arama ──────────────────────────────────────
  let barcodeDecodeFailures = 0;
  let pendingBarcode = null;

  function openManualEntry() {
    el('manualEntryWrap').hidden = false;
    el('manualEntryLinkBtn').hidden = true;
  }

  // Elle giriş açıkken bile yeniden çekme adımına dönülebilsin diye
  // captureStep'i her zaman desteğe göre ayarlar; manuel alanın durumuna
  // dokunmaz (zaten açıksa açık kalır).
  function resetScanState() {
    barcodeDecodeFailures = 0;
    pendingBarcode = null;
    el('confirmStep').hidden = true;
    el('scanError').hidden = true;
    el('manualBarcode').value = '';

    const supported = hasBarcodeDetectorSupport();
    el('captureStep').hidden = !supported;
    if (supported) {
      el('manualEntryWrap').hidden = true;
      el('manualEntryLinkBtn').hidden = true;
    }
  }

  // Lookup başarısız olup ekrandan ayrılmadığımızda kullanıcı eylemsiz
  // kalmasın — yeniden çekme adımı geri gösterilir (elle giriş zaten
  // açıksa açık kalır, kapatılmaz).
  function restoreScanActionableUI() {
    el('confirmStep').hidden = true;
    el('captureStep').hidden = !hasBarcodeDetectorSupport();
  }

  async function handleBarcodePhoto() {
    const input = el('barcodePhotoInput');
    const file = input.files[0];
    input.value = '';
    if (!file) return;

    const errorEl = el('scanError');
    errorEl.hidden = true;

    try {
      const rawValue = await detectBarcodeFromFile(file);
      if (!rawValue) throw new Error('not_detected');

      pendingBarcode = rawValue;
      el('confirmBarcodeDisplay').textContent = formatBarcodeForDisplay(rawValue);
      el('captureStep').hidden = true;
      el('confirmStep').hidden = false;
    } catch {
      barcodeDecodeFailures += 1;
      errorEl.textContent = 'Barkod okunamadı — yakından, düz ve iyi ışıkta tekrar çek.';
      errorEl.hidden = false;
      if (barcodeDecodeFailures >= 2) {
        el('manualEntryLinkBtn').hidden = false;
      }
    }
  }

  function bindScanScreen() {
    const supported = hasBarcodeDetectorSupport();
    el('captureStep').hidden = !supported;
    el('noScannerHint').hidden = supported;
    // iOS Safari (ve diğer desteksiz tarayıcılar): iki deneme beklenmez,
    // elle giriş doğrudan açık gelir (bkz. görev onayı, madde 1).
    if (!supported) openManualEntry();

    el('startScanBtn').addEventListener('click', () => {
      el('barcodePhotoInput').click();
    });

    el('barcodePhotoInput').addEventListener('change', () => void handleBarcodePhoto());

    el('confirmYesBtn').addEventListener('click', () => {
      if (!pendingBarcode) return;
      const barcode = pendingBarcode;
      pendingBarcode = null;
      el('confirmStep').hidden = true;
      void lookupBarcode(barcode);
    });

    el('confirmRetryBtn').addEventListener('click', () => {
      pendingBarcode = null;
      el('confirmStep').hidden = true;
      el('captureStep').hidden = !hasBarcodeDetectorSupport();
    });

    el('manualEntryLinkBtn').addEventListener('click', () => openManualEntry());

    el('manualLookupBtn').addEventListener('click', () => {
      const barcode = el('manualBarcode').value.trim();
      if (barcode) void lookupBarcode(barcode);
    });

    el('backToScanBtn').addEventListener('click', () => {
      showScreen('scan');
      resetScanState();
    });
  }

  let currentLookup = null; // { barcode, status, neededSlots, ... }

  async function lookupBarcode(barcode) {
    const errorEl = el('scanError');
    errorEl.hidden = true;

    try {
      const response = await apiFetch(`/lookup?barcode=${encodeURIComponent(barcode)}`);
      const body = await response.json();

      if (!response.ok) {
        errorEl.textContent =
          body.error === 'invalid_gtin' ? 'Geçersiz barkod (sağlama toplamı tutmuyor).' : 'Barkod aranamadı.';
        errorEl.hidden = false;
        restoreScanActionableUI();
        return;
      }

      currentLookup = Object.assign({ barcode }, body);
      renderResultScreen();
      showScreen('result');
    } catch {
      errorEl.textContent = 'Bağlantı kurulamadı, tekrar deneyin.';
      errorEl.hidden = false;
      restoreScanActionableUI();
    }
  }

  // ── Ekran: Sonuç + fotoğraf toplama ─────────────────────────────────────
  const capturedPhotos = {}; // slot -> { blob, previewUrl }

  function renderResultScreen() {
    const statusEl = el('resultStatus');
    const captureForm = el('captureForm');
    statusEl.className = `result-status ${currentLookup.status}`;

    if (currentLookup.status === 'duplicate') {
      const date = currentLookup.collectedAt ? new Date(currentLookup.collectedAt).toLocaleString('tr-TR') : '?';
      statusEl.textContent = `Bu barkod zaten toplandı — ${date}, ${currentLookup.volunteerCode || '?'}`;
      captureForm.hidden = true;
      return;
    }

    if (currentLookup.status === 'complete') {
      statusEl.textContent = 'Katalogda var, verisi tam — fotoğraf gerekmiyor.';
      captureForm.hidden = true;
      return;
    }

    const productName = currentLookup.productName ? ` (${currentLookup.productName})` : '';
    statusEl.textContent =
      currentLookup.status === 'new'
        ? `Yeni ürün${productName} — 3 fotoğraf gerekiyor.`
        : `Katalogda var ama eksik${productName} — yalnızca eksik olanlar isteniyor.`;

    captureForm.hidden = false;
    for (const key of Object.keys(capturedPhotos)) delete capturedPhotos[key];
    renderSlots(currentLookup.neededSlots);
    updateSubmitButtonState();
  }

  function renderSlots(slots) {
    const wrap = el('slotsWrap');
    wrap.innerHTML = '';

    for (const slot of slots) {
      const card = document.createElement('div');
      card.className = 'slot-card';
      card.innerHTML = `
        <div class="slot-title">
          <span>${SLOT_LABELS[slot] || slot}</span>
          <span class="slot-status pending" data-slot-status="${slot}">bekliyor</span>
        </div>
        <input type="file" accept="image/*" capture="environment" data-slot-input="${slot}" />
        <button type="button" class="secondary slot-capture-btn" data-slot-btn="${slot}">Fotoğraf çek</button>
      `;
      wrap.appendChild(card);

      const input = card.querySelector(`[data-slot-input="${slot}"]`);
      card.querySelector(`[data-slot-btn="${slot}"]`).addEventListener('click', () => input.click());

      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;

        const statusBadge = card.querySelector(`[data-slot-status="${slot}"]`);
        statusBadge.textContent = 'işleniyor...';

        try {
          const blob = await resizeImageFile(file);
          capturedPhotos[slot] = { blob, previewUrl: URL.createObjectURL(blob) };

          let preview = card.querySelector('img.slot-preview');
          if (!preview) {
            preview = document.createElement('img');
            preview.className = 'slot-preview';
            card.insertBefore(preview, card.firstChild);
          }
          preview.src = capturedPhotos[slot].previewUrl;

          statusBadge.textContent = 'çekildi';
          statusBadge.className = 'slot-status captured';
          card.querySelector(`[data-slot-btn="${slot}"]`).textContent = 'Yeniden çek';
        } catch {
          statusBadge.textContent = 'hata — tekrar dene';
          statusBadge.className = 'slot-status error';
        }

        updateSubmitButtonState();
      });
    }
  }

  function updateSubmitButtonState() {
    const allCaptured = currentLookup.neededSlots.every((slot) => capturedPhotos[slot]);
    el('submitProductBtn').disabled = !allCaptured || currentLookup.neededSlots.length === 0;
  }

  async function submitProduct() {
    const errorEl = el('submitError');
    const successEl = el('submitSuccess');
    errorEl.hidden = true;
    successEl.hidden = true;

    const session = getSession();
    const category = el('categorySelect').value;
    const photos = {};
    for (const slot of currentLookup.neededSlots) photos[slot] = capturedPhotos[slot].blob;

    const job = {
      barcode: currentLookup.barcode,
      marketChain: session.chain,
      marketChainOther: session.chain === LOCAL_MARKET_CHAIN_KEY ? session.marketChainOther : '',
      city: session.city,
      category,
      clientCreatedAt: new Date().toISOString(),
      requestedSlots: currentLookup.neededSlots,
      photos,
      submissionId: null,
      uploadedSlots: [],
      lastError: null,
    };

    await queueAdd(job);
    await updatePendingIndicator();
    successEl.textContent = 'Kuyruğa eklendi — bağlantı varsa birazdan gönderilecek.';
    successEl.hidden = false;

    void syncQueue();

    setTimeout(() => {
      showScreen('scan');
      resetScanState();
    }, 1200);
  }

  function bindResultScreen() {
    el('submitProductBtn').addEventListener('click', () => void submitProduct());
  }

  // ── Başlangıç ─────────────────────────────────────────────────────────
  async function init() {
    initLoginScreen();
    bindSessionScreen();
    bindScanScreen();
    bindResultScreen();

    const meta = await loadMeta();
    fillSelect(el('categorySelect'), meta.categories);

    await updatePendingIndicator();
    void syncQueue();

    const { code, key } = getSavedCredentials();
    if (code && key) {
      renderSessionInfo();
      await proceedAfterLogin();
    } else {
      showScreen('login');
    }
  }

  document.addEventListener('DOMContentLoaded', () => void init());
})();
