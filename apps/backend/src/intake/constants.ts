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

/** Serbest metinle yerel market adı girilen özel kod (bkz. LOCAL_MARKET_NAME_PATTERN). */
export const LOCAL_MARKET_CHAIN_KEY = 'yerel';

export const INTAKE_MARKET_CHAINS: IntakeOption[] = [
  { key: 'a101', label: 'A101' },
  { key: 'bim', label: 'BİM' },
  { key: 'sok', label: 'Şok' },
  { key: 'migros', label: 'Migros' },
  { key: 'carrefoursa', label: 'CarrefourSA' },
  { key: 'tarim_kredi', label: 'Tarım Kredi Kooperatif' },
  { key: 'hakmar', label: 'Hakmar' },
  { key: 'onur', label: 'Onur Market' },
  { key: 'ozhan', label: 'Özhan Market' },
  { key: 'groseri', label: 'Groseri' },
  { key: 'sec', label: 'Seç Market' },
  { key: LOCAL_MARKET_CHAIN_KEY, label: 'Yerel market (adını yaz)' },
];

export const INTAKE_CATEGORIES: IntakeOption[] = [
  { key: 'sut_urunleri', label: 'Süt ve süt ürünleri' },
  { key: 'kahvaltilik', label: 'Kahvaltılık' },
  { key: 'atistirmalik', label: 'Atıştırmalık' },
  { key: 'icecek', label: 'İçecek' },
  { key: 'sicak_icecek', label: 'Çay ve kahve' },
  { key: 'bakliyat_tahil', label: 'Bakliyat ve tahıl' },
  { key: 'makarna_eriste', label: 'Makarna ve erişte' },
  { key: 'unlu_mamul', label: 'Ekmek ve unlu mamul' },
  { key: 'konserve_hazir', label: 'Konserve ve hazır yemek' },
  { key: 'yag_sos', label: 'Yağ ve sos' },
  { key: 'sekerli', label: 'Şekerli ürünler' },
  { key: 'dondurulmus', label: 'Dondurulmuş ve dondurma' },
  { key: 'bebek', label: 'Bebek ürünleri' },
  { key: 'et_sarkuteri', label: 'Et ve şarküteri (ambalajlı)' },
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

/** Yalnız harf (TR dahil), rakam, boşluk, nokta, tire — baştaki/sondaki boşluk zaten trim edilmiş olmalı. */
const LOCAL_MARKET_NAME_PATTERN = /^[\p{L}0-9 .-]+$/u;
export const LOCAL_MARKET_NAME_MAX_LENGTH = 60;

/** "yerel" market zinciri seçildiğinde zorunlu olan serbest metnin kuralı (bkz. görev onayı). */
export function isValidLocalMarketName(name: string): boolean {
  return name.length > 0 && name.length <= LOCAL_MARKET_NAME_MAX_LENGTH && LOCAL_MARKET_NAME_PATTERN.test(name);
}
