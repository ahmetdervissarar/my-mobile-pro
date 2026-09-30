/**
 * RafSkoru — Intake sabit listeleri (market zinciri, şehir, kategori)
 * apps/backend/src/intake/constants.ts
 *
 * Tek kaynak: apps/intake/ (gönüllü sayfası) bu listeleri GET /api/intake/meta
 * üzerinden çeker — HTML'e ayrı, elle senkronize edilen bir kopya YAZILMAZ.
 * Kategoriler bilinçli olarak fiyat/skor motorunun productGroups
 * kayıt defterinden (registry.ts) AYRIDIR: o kayıt defteri otomatik
 * eşleştirme için ince taneli (onlarca anahtar); burası bir gönüllünün
 * mağazada saniyeler içinde seçebileceği kaba bir liste olmalı.
 */
export interface IntakeOption {
  key: string;
  label: string;
}

export const INTAKE_MARKET_CHAINS: IntakeOption[] = [
  { key: 'migros', label: 'Migros' },
  { key: 'a101', label: 'A101' },
  { key: 'bim', label: 'BİM' },
  { key: 'sok', label: 'ŞOK' },
  { key: 'carrefoursa', label: 'CarrefourSA' },
  { key: 'hakmar', label: 'Hakmar' },
  { key: 'diger', label: 'Diğer' },
];

export const INTAKE_CATEGORIES: IntakeOption[] = [
  { key: 'sut_urunleri', label: 'Süt ürünleri' },
  { key: 'et_urunleri', label: 'Et ve şarküteri' },
  { key: 'firin_ekmek', label: 'Fırın ve ekmek' },
  { key: 'meyve_sebze', label: 'Meyve ve sebze' },
  { key: 'atistirmalik', label: 'Atıştırmalık' },
  { key: 'icecek', label: 'İçecek' },
  { key: 'kahvaltilik', label: 'Kahvaltılık' },
  { key: 'temel_gida', label: 'Temel gıda (bakliyat, un, şeker)' },
  { key: 'dondurulmus', label: 'Dondurulmuş ürün' },
  { key: 'konserve', label: 'Konserve ve hazır yemek' },
  { key: 'bebek_urunleri', label: 'Bebek ürünleri' },
  { key: 'kisisel_bakim', label: 'Kişisel bakım' },
  { key: 'temizlik', label: 'Temizlik' },
  { key: 'diger', label: 'Diğer' },
];

/** Türkiye'nin 81 ili, alfabetik. */
export const INTAKE_CITIES: IntakeOption[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
].map((name) => ({ key: name.toLocaleLowerCase('tr-TR'), label: name }));

export const INTAKE_PHOTO_SLOTS: IntakeOption[] = [
  { key: 'front', label: 'Ön yüz' },
  { key: 'ingredients', label: 'İçindekiler' },
  { key: 'nutrition', label: 'Besin tablosu' },
];

function toKeySet(options: IntakeOption[]): Set<string> {
  return new Set(options.map((option) => option.key));
}

const marketChainKeys = toKeySet(INTAKE_MARKET_CHAINS);
const categoryKeys = toKeySet(INTAKE_CATEGORIES);
const cityKeys = toKeySet(INTAKE_CITIES);

export function isKnownMarketChain(key: string): boolean {
  return marketChainKeys.has(key);
}

export function isKnownCategory(key: string): boolean {
  return categoryKeys.has(key);
}

export function isKnownCity(key: string): boolean {
  return cityKeys.has(key);
}
