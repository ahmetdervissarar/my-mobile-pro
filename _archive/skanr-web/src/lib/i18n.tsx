import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "tr" | "en" | "ar";

type Dict = Record<string, string>;

const tr: Dict = {
  "app.greeting": "Merhaba 👋",
  "app.tagline": "Bugün ne tarıyorsun?",
  "loc.active": "Konum aktif • mesafeler güncel",
  "loc.asking": "Konum alınıyor…",
  "loc.allow": "Konum izni ver",
  "scan.start": "Taramayı başlat",
  "scan.aim": "Barkodu kareye hizalayın",
  "result.title": "Tarama sonucu",
  "result.sample": "Örnek ürün",
  "result.loading": "Ürün aranıyor…",
  "result.notFound": "Bu barkod için ürün bulunamadı.",
  "result.error": "Ürün bilgisi alınamadı. Bağlantınızı kontrol edin.",
  "card.bestPrice": "En uygun",
  "card.healthScore": "Sağlık skoru",
  "card.expand": "Detayları gör",
  "card.collapse": "Daha az göster",
  "card.markets": "Yakındaki marketler",
  "card.nutrients": "Besin değerleri (100g)",
  "card.directions": "yol tarifi",
  "nutri.energy": "Enerji",
  "nutri.fat": "Yağ",
  "nutri.sugar": "Şeker",
  "nutri.salt": "Tuz",
  "nova.1": "İşlenmemiş",
  "nova.2": "Mutfak bileşeni",
  "nova.3": "İşlenmiş",
  "nova.4": "Ultra işlenmiş",
  "nav.home": "Ana",
  "nav.history": "Geçmiş",
  "nav.discover": "Keşfet",
  "nav.profile": "Profil",
  "warn.title": "Bu ürün size uygun değil",
  "warn.allergen": "İçinde bulundurduğu alerjen:",
  "warn.condition": "Sağlık durumunuz için riskli:",
  "warn.dismiss": "Anladım",
  "profile.title": "Sağlık Profilim",
  "profile.subtitle": "Alerjenleri ve kronik rahatsızlıklarınızı seçin. Risk içeren ürünlerde sizi uyaralım.",
  "profile.allergens": "Alerjenler",
  "profile.conditions": "Kronik rahatsızlıklar",
  "profile.lang": "Uygulama dili",
  "profile.save": "Kaydet",
  "profile.saved": "Kaydedildi ✓",
  "profile.back": "Geri",
  "alg.gluten": "Gluten",
  "alg.milk": "Süt / laktoz",
  "alg.eggs": "Yumurta",
  "alg.peanuts": "Yer fıstığı",
  "alg.nuts": "Sert kabuklu yemiş",
  "alg.soy": "Soya",
  "alg.fish": "Balık",
  "alg.shellfish": "Kabuklu deniz ürünleri",
  "alg.sesame": "Susam",
  "alg.celery": "Kereviz",
  "alg.mustard": "Hardal",
  "alg.sulphites": "Sülfitler",
  "cond.diabetes": "Diyabet",
  "cond.hypertension": "Hipertansiyon",
  "cond.celiac": "Çölyak",
  "cond.heart": "Kalp / kolesterol",
  "cond.kidney": "Böbrek hastalığı",
  "cond.lactose": "Laktoz intoleransı",
  "src.title": "Veri kaynakları",
  "src.body": "Ürün bilgileri Open Food Facts'ten, canlı market fiyatları T.C. Ticaret Bakanlığı destekli marketfiyati.org.tr platformundan gelir. BİM, A101, Migros, ŞOK, CarrefourSA — Türkiye geneli.",
};

const en: Dict = {
  "app.greeting": "Hi 👋",
  "app.tagline": "What are you scanning today?",
  "loc.active": "Location on • distances live",
  "loc.asking": "Getting location…",
  "loc.allow": "Allow location",
  "scan.start": "Start scan",
  "scan.aim": "Align the barcode in the frame",
  "result.title": "Scan result",
  "result.sample": "Sample product",
  "result.loading": "Looking up product…",
  "result.notFound": "No product found for this barcode.",
  "result.error": "Could not load product. Check your connection.",
  "card.bestPrice": "Best price",
  "card.healthScore": "Health score",
  "card.expand": "Show details",
  "card.collapse": "Show less",
  "card.markets": "Nearby markets",
  "card.nutrients": "Nutrition (per 100g)",
  "card.directions": "directions",
  "nutri.energy": "Energy",
  "nutri.fat": "Fat",
  "nutri.sugar": "Sugar",
  "nutri.salt": "Salt",
  "nova.1": "Unprocessed",
  "nova.2": "Culinary ingredient",
  "nova.3": "Processed",
  "nova.4": "Ultra-processed",
  "nav.home": "Home",
  "nav.history": "History",
  "nav.discover": "Discover",
  "nav.profile": "Profile",
  "warn.title": "This product may not suit you",
  "warn.allergen": "Contains allergen:",
  "warn.condition": "Risky for your condition:",
  "warn.dismiss": "Got it",
  "profile.title": "My Health Profile",
  "profile.subtitle": "Select your allergens and chronic conditions. We'll warn you on risky products.",
  "profile.allergens": "Allergens",
  "profile.conditions": "Chronic conditions",
  "profile.lang": "App language",
  "profile.save": "Save",
  "profile.saved": "Saved ✓",
  "profile.back": "Back",
  "alg.gluten": "Gluten",
  "alg.milk": "Milk / lactose",
  "alg.eggs": "Eggs",
  "alg.peanuts": "Peanuts",
  "alg.nuts": "Tree nuts",
  "alg.soy": "Soy",
  "alg.fish": "Fish",
  "alg.shellfish": "Shellfish",
  "alg.sesame": "Sesame",
  "alg.celery": "Celery",
  "alg.mustard": "Mustard",
  "alg.sulphites": "Sulphites",
  "cond.diabetes": "Diabetes",
  "cond.hypertension": "Hypertension",
  "cond.celiac": "Celiac disease",
  "cond.heart": "Heart / cholesterol",
  "cond.kidney": "Kidney disease",
  "cond.lactose": "Lactose intolerance",
  "src.title": "Data sources",
  "src.body": "Product info from Open Food Facts, live market prices from marketfiyati.org.tr (Turkish Ministry of Trade open data). BİM, A101, Migros, ŞOK, CarrefourSA — nationwide.",
};

const ar: Dict = {
  "app.greeting": "مرحباً 👋",
  "app.tagline": "ماذا ستفحص اليوم؟",
  "loc.active": "الموقع مفعّل • المسافات محدّثة",
  "loc.asking": "جاري تحديد الموقع…",
  "loc.allow": "السماح بالموقع",
  "scan.start": "ابدأ المسح",
  "scan.aim": "حاذِ الباركود داخل الإطار",
  "result.title": "نتيجة المسح",
  "result.sample": "منتج تجريبي",
  "result.loading": "جاري البحث عن المنتج…",
  "result.notFound": "لم يتم العثور على منتج لهذا الباركود.",
  "result.error": "تعذّر تحميل المنتج. تحقق من اتصالك.",
  "card.bestPrice": "أفضل سعر",
  "card.healthScore": "نقاط الصحة",
  "card.expand": "عرض التفاصيل",
  "card.collapse": "عرض أقل",
  "card.markets": "الأسواق القريبة",
  "card.nutrients": "القيم الغذائية (100غ)",
  "card.directions": "الاتجاهات",
  "nutri.energy": "الطاقة",
  "nutri.fat": "الدهون",
  "nutri.sugar": "السكر",
  "nutri.salt": "الملح",
  "nova.1": "غير معالج",
  "nova.2": "مكوّن مطبخ",
  "nova.3": "معالج",
  "nova.4": "فائق المعالجة",
  "nav.home": "الرئيسية",
  "nav.history": "السجل",
  "nav.discover": "اكتشف",
  "nav.profile": "الملف",
  "warn.title": "قد لا يناسبك هذا المنتج",
  "warn.allergen": "يحتوي على مادة مسببة للحساسية:",
  "warn.condition": "خطر على حالتك الصحية:",
  "warn.dismiss": "فهمت",
  "profile.title": "ملفي الصحي",
  "profile.subtitle": "اختر مسببات الحساسية والأمراض المزمنة. سننبّهك على المنتجات الخطرة.",
  "profile.allergens": "مسببات الحساسية",
  "profile.conditions": "الأمراض المزمنة",
  "profile.lang": "لغة التطبيق",
  "profile.save": "حفظ",
  "profile.saved": "تم الحفظ ✓",
  "profile.back": "رجوع",
  "alg.gluten": "الغلوتين",
  "alg.milk": "الحليب / اللاكتوز",
  "alg.eggs": "البيض",
  "alg.peanuts": "الفول السوداني",
  "alg.nuts": "المكسرات",
  "alg.soy": "الصويا",
  "alg.fish": "السمك",
  "alg.shellfish": "القشريات",
  "alg.sesame": "السمسم",
  "alg.celery": "الكرفس",
  "alg.mustard": "الخردل",
  "alg.sulphites": "الكبريتات",
  "cond.diabetes": "السكري",
  "cond.hypertension": "ارتفاع ضغط الدم",
  "cond.celiac": "الداء البطني",
  "cond.heart": "القلب / الكوليسترول",
  "cond.kidney": "أمراض الكلى",
  "cond.lactose": "عدم تحمّل اللاكتوز",
  "src.title": "مصادر البيانات",
  "src.body": "معلومات المنتج من Open Food Facts، الأسعار الحية من marketfiyati.org.tr (بيانات مفتوحة لوزارة التجارة التركية). BİM، A101، Migros، ŞOK، CarrefourSA — على مستوى تركيا.",
};

const dicts: Record<Lang, Dict> = { tr, en, ar };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("skanr.lang")) as Lang | null;
    if (saved && ["tr", "en", "ar"].includes(saved)) setLangState(saved);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("skanr.lang", l);
    } catch {
      // ignore
    }
  };

  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key;
  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  return <I18nCtx.Provider value={{ lang, setLang, t, dir }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export const ALLERGEN_KEYS = [
  "gluten",
  "milk",
  "eggs",
  "peanuts",
  "nuts",
  "soy",
  "fish",
  "shellfish",
  "sesame",
  "celery",
  "mustard",
  "sulphites",
] as const;

export const CONDITION_KEYS = [
  "diabetes",
  "hypertension",
  "celiac",
  "heart",
  "kidney",
  "lactose",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];
export type ConditionKey = (typeof CONDITION_KEYS)[number];
