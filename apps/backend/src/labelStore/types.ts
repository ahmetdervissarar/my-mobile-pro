/**
 * RafSkoru — Etiket okuma deposu tipleri (ADR-009)
 * apps/backend/src/labelStore/types.ts
 *
 * Bu tipler yalnız depo katmanına aittir. ProductFacts sözleşmesine
 * (price/productFacts/types.ts) bağlanmaları AYRI bir iştir (Faz 1, İş 1.2)
 * ve sözleşme incelemesi gerektirir — burada o sözleşmeye dokunulmaz.
 *
 * Temel kural (ADR-009 §3): alanlar etikette GÖRÜNEN metnin aktarımıdır.
 * Okunamayan alan null kalır ve unreadableFields içinde adıyla anılır;
 * hiçbir katman null bir alanı varsayılan bir değerle doldurmaz.
 */

/** Fotoğrafın nereden geldiği (ADR-009 §8 — izinli kaynaklar). */
export type LabelPhotoSource = 'off_photo' | 'intake' | 'user_app';

/** Okumayı hangi çalıştırma biçiminin yaptığı (ADR-009 §9). */
export type LabelReaderKind = 'desktop_session' | 'api';

export type LabelPhotoSlot = 'front' | 'ingredients' | 'nutrition';

/**
 * Nutri-Score hesabının gerektirdiği ürün türü (İş 1.3c). Etiketten OKUNAN bir
 * alan değildir: kullanıcı fotoğraf çekerken beyan eder veya onaylayan belirler.
 * Tür bilinmiyorsa null kalır; ürün adından veya görselden tahmin edilmez.
 */
export type LabelProductKind =
  | 'general'
  | 'beverage'
  | 'water'
  | 'cheese'
  | 'fat_oil_nuts_seeds'
  | 'red_meat'
  | 'not_applicable'
  /** Alkollü içecek: Nutri-Score uygulanmaz ve RafSkoru puanı verilmez (ADR-009 §11). */
  | 'alcoholic_beverage'
  /** Gıda dışı ürün (kozmetik, temizlik vb.): puan ve Nutri-Score verilmez (ADR-009 §14). */
  | 'non_food';

/** Türü kimin belirlediği: fotoğrafı çeken kullanıcı mı, onaylayan mı. */
export type LabelProductKindSource = 'user_declared' | 'approver';

/**
 * Aday kaydın yaşam döngüsü (ADR-009 §3):
 *   awaiting_read → read → agreed | disagreed → approved | rejected
 * approved ve rejected son durumlardır.
 */
export type LabelCandidateStatus = 'awaiting_read' | 'read' | 'agreed' | 'disagreed' | 'approved' | 'rejected';

export interface LabelPhotoRef {
  slot: LabelPhotoSlot;
  /** Dosya yolu veya adres. Depo içeriğe bakmaz; yalnız kanıt göstergesidir. */
  ref: string;
  /** Kaynağın istediği atıf metni (ör. OFF fotoğrafları için CC-BY-SA atfı). */
  attribution: string | null;
}

export interface LabelNutritionPer100 {
  /** Tablonun hangi birime göre yazıldığı; okunamadıysa null. */
  basis: '100g' | '100ml' | null;
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export interface LabelFields {
  productName: string | null;
  brand: string | null;
  /** Etikette yazdığı gibi net miktar (ör. "1 L", "500 g"). */
  quantityText: string | null;
  /** İçindekiler listesi, etikette yazdığı gibi. */
  ingredientsText: string | null;
  ingredientsLang: string | null;
  /** Etiketteki alerjen beyanı ifadesi, olduğu gibi (ör. "Süt ürünü içerir."). */
  allergenStatementText: string | null;
  /** Etiketteki eser/çapraz bulaşma ifadesi, olduğu gibi (ör. "Eser miktarda fındık içerebilir."). */
  traceStatementText: string | null;
  nutritionPer100: LabelNutritionPer100 | null;
}

export interface LabelRead {
  reader: LabelReaderKind;
  /** Okumayı yapan model kimliği; bilinmiyorsa null. */
  model: string | null;
  readAt: string;
  fields: LabelFields;
  /** Fotoğrafta bulunup okunamayan alanların adları. */
  unreadableFields: string[];
  /**
   * Okuyucunun onaylayana notu (ör. "değerler bir satır kaymış", "fotoğraf bir
   * web sayfası"). Yalnız onay ekranında gösterilir; hiçbir alana, puana veya
   * alerjen değerlendirmesine girmez. Not yoksa null.
   */
  notes?: string | null;
}

export interface LabelCandidate {
  id: string;
  barcode: string;
  photoSource: LabelPhotoSource;
  photos: LabelPhotoRef[];
  /** Etiketin görüldüğü/fotoğraflandığı an (ISO). Kayıt yazım zamanı DEĞİL. */
  observedAt: string;
  /** Fotoğrafı gönderenin beyan ettiği ürün türü; beyan edilmediyse null. */
  declaredProductKind: LabelProductKind | null;
  status: LabelCandidateStatus;
  extractRead: LabelRead | null;
  verifyRead: LabelRead | null;
  /** İki okumanın ayrıştığı alan adları; doğrulama yapılmadıysa null. */
  differingFields: string[] | null;
  decidedBy: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * İnsan onaylı etiket kaydı. "Doğrulama kaydı tam" sayılması için gereken üç
 * öğeyi her zaman taşır (ADR-009 §4): observedAt + etiket fotoğrafı + onaylayan.
 */
export interface VerifiedLabelProduct {
  barcode: string;
  /** Barkod başına 1'den başlar; her yeni onay yeni sürümdür. */
  version: number;
  fields: LabelFields;
  observedAt: string;
  photos: LabelPhotoRef[];
  photoSource: LabelPhotoSource;
  candidateId: string;
  /** Nutri-Score için ürün türü; bilinmiyorsa null (o zaman not hesaplanmaz). */
  productKind: LabelProductKind | null;
  productKindSource: LabelProductKindSource | null;
  approvedBy: string;
  approvedAt: string;
  /** Yerine yeni sürüm geldiyse o an; güncel sürümde null. Eski sürüm silinmez. */
  supersededAt: string | null;
}

export interface CreateCandidateInput {
  barcode: string;
  photoSource: LabelPhotoSource;
  photos: LabelPhotoRef[];
  observedAt: string;
  /** Fotoğrafı gönderenin beyan ettiği ürün türü (isteğe bağlı). */
  declaredProductKind?: LabelProductKind | null;
}

export interface ApproveCandidateInput {
  approvedBy: string;
  /**
   * Onaylayanın düzelttiği alanlar. Verilmezse çıkarım okumasının alanları
   * kullanılır. Çıkarım okuması aday kayıtta değişmeden kalır.
   */
  fields?: LabelFields;
  /**
   * Onaylayanın belirlediği ürün türü. Verilirse kaynağı 'approver' olur
   * (null vermek "bilinmiyor" demektir). Hiç verilmezse adayın beyan ettiği
   * tür 'user_declared' kaynağıyla taşınır.
   */
  productKind?: LabelProductKind | null;
}

export interface RejectCandidateInput {
  rejectedBy: string;
  reason: string;
}
