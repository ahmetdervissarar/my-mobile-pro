import { ScanLine, Camera } from "lucide-react";

export function ScannerHero({ onScan }: { onScan: () => void }) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden p-6 text-primary-foreground"
      style={{ background: "var(--gradient-scan)", boxShadow: "var(--shadow-elevated)" }}
    >
      {/* glow blobs */}
      <div className="absolute -top-12 -right-12 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 size-44 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Akıllı tarayıcı</p>
        <h2 className="font-display font-bold text-2xl mt-2 leading-tight">
          Ürünü tara,<br />en iyi fiyatı + sağlık puanını gör
        </h2>

        {/* scan target */}
        <div className="mt-6 aspect-[5/3] rounded-2xl border border-white/30 bg-black/15 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-4 rounded-xl border-2 border-white/70 border-dashed flex items-center justify-center">
            <Camera className="size-10 opacity-80" />
          </div>
          {/* scan line */}
          <div className="absolute left-4 right-4 h-0.5 bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-[scan_2.4s_ease-in-out_infinite]" />
        </div>

        <button
          onClick={onScan}
          className="mt-5 w-full py-4 rounded-2xl bg-white text-foreground font-display font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <ScanLine className="size-5" />
          Taramayı başlat
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 12%; opacity: 0.4; }
          50% { top: 88%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
