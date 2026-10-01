/**
 * RafSkoru — Puan Hüküm Kelimesi Bastırma
 * src/ui/scoreVerdict.ts
 *
 * P2 (alerjen kapısı skorun üstünde) ve grup-tahmini kuralları: ScorePill/
 * ScoreRing'in gösterdiği METNİ tek yerden üretir, böylece "hüküm kelimesi
 * hiç görünmemeli" testi (scoreVerdict.smoke.ts) render'a değil bu saf
 * fonksiyona bakarak doğrulanabilir.
 */
import { getScoreBand } from './scoreBand';

export const VERDICT_WORDS = ['Çok iyi', 'İyi', 'Orta', 'Zayıf'];

export interface ScorePillTextInput {
  score: number | null;
  /** Profille çakışan alerjen varsa true — hüküm kelimesi ASLA gösterilmez. */
  allergenPriority?: boolean;
  /** Grup tahmini puan — hüküm kelimesi ASLA gösterilmez, yalnız "Puan (tahmini): N". */
  isEstimate?: boolean;
  /**
   * Fiyatsız değerlendirme (onaylı KARAR): fiyat bileşeni eksik olduğu
   * için kalan boyutlardan renormalize edilerek hesaplanmış puan.
   * allergenPriority/isEstimate önceliklidir.
   */
  isPriceless?: boolean;
}

export function getScorePillLabel({
  score,
  allergenPriority = false,
  isEstimate = false,
  isPriceless = false,
}: ScorePillTextInput): string {
  if (allergenPriority) {
    return 'Puan: Alerjen uyarısı öncelikli';
  }
  if (isEstimate) {
    return `Puan (tahmini): ${score === null ? '—' : Math.round(score)}`;
  }
  if (isPriceless && score !== null) {
    return `Puan (fiyatsız): ${Math.round(score)}`;
  }
  const band = getScoreBand(score);
  return score === null ? 'Puan: Veri yok' : `Puan: ${Math.round(score)} · ${band?.label ?? ''}`;
}

export function getScoreRingBandText(score: number | null, allergenPriority: boolean): string {
  if (allergenPriority) {
    return 'Alerjen uyarısı öncelikli';
  }
  const band = getScoreBand(score);
  return band ? band.label : 'Veri yok';
}
