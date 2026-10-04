// Görev (ürün görselleri — yeniden içe aktarma hazırlığı): ayrı, saf bir
// modül — importOffTurkey.ts'in main()'i (gerçek ağ/dump erişimi, modül
// import edilince hemen çalışır) içine KONULMADI; aksi halde bu fonksiyonu
// test etmek bile (test dosyası import ettiği anda) gerçek bir içe
// aktarmayı TETİKLERDİ.
//
// Önceki kod products.jsonl'ı içe aktarma BAŞLARKEN hemen truncate
// ediyordu (createWriteStream varsayılan 'w' modu) — işlem yarıda
// kesilirse (ağ hatası, Ctrl+C) elimizde çalışan ESKİ dosya kalmıyordu,
// yarım/bozuk bir dosya kalıyordu. Artık: önce bir staging dosyasına
// yazılır; yalnız en az bir kayıt başarıyla yazıldıysa eski dosya zaman
// damgalı bir yedeğe taşınır ve staging dosyası YERİNE geçirilir (atomik
// rename). writtenCount 0 ise (ör. kaynak tamamen boş/erişilemez) var
// olan iyi dosyaya DOKUNULMAZ.
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

export function finalizeImportOutput(input: {
  outDir: string;
  stagingFileName: string;
  finalFileName: string;
  writtenCount: number;
  backupSuffix: string;
}): { finalPath: string; backupPath: string | null; skipped: boolean } {
  const stagingPath = resolve(input.outDir, input.stagingFileName);
  const finalPath = resolve(input.outDir, input.finalFileName);

  if (input.writtenCount === 0) {
    return { finalPath, backupPath: null, skipped: true };
  }

  let backupPath: string | null = null;
  if (existsSync(finalPath)) {
    backupPath = resolve(input.outDir, `${input.finalFileName}.bak-${input.backupSuffix}`);
    renameSync(finalPath, backupPath);
  }
  renameSync(stagingPath, finalPath);

  return { finalPath, backupPath, skipped: false };
}
