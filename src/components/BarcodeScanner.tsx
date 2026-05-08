import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import ZXing from "@zxing/library";
const { BarcodeFormat, DecodeHintType } = ZXing;
import { X, Loader2, Camera as CameraIcon, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  onPhotoCaptured?: (imageBase64: string, mimeType: string) => void;
};

export function BarcodeScanner({ open, onClose, onDetected, onPhotoCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    // Restrict to common product barcode formats — speeds detection and
    // eliminates noisy QR/Aztec/DataMatrix attempts that flood the console.
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1];
        const deviceId = back?.deviceId;

        if (!videoRef.current) return;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, _err, ctrls) => {
            if (cancelled) return;
            if (result) {
              ctrls.stop();
              onDetected(result.getText());
            }
          },
        );
        controlsRef.current = controls;
        if (!cancelled) setStarting(false);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(
            e?.name === "NotAllowedError"
              ? "Kamera izni reddedildi. Tarayıcı ayarlarından izin verin."
              : "Kamera başlatılamadı. Cihazınızda kamera yok ya da kullanımda olabilir.",
          );
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  const handleCapture = async () => {
    if (!videoRef.current || !onPhotoCaptured || capturing) return;
    setCapturing(true);
    try {
      const v = videoRef.current;
      const w = v.videoWidth || 1280;
      const h = v.videoHeight || 720;
      const canvas = document.createElement("canvas");
      // Cap to 1280px on long edge to keep payload small
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      controlsRef.current?.stop();
      onPhotoCaptured(base64, "image/jpeg");
    } catch (e) {
      console.error(e);
      setError("Fotoğraf alınamadı.");
    } finally {
      setCapturing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-5 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-[0.2em]">Tarama</p>
          <h2 className="text-white font-display font-semibold text-lg">Barkodu çerçeveye hizalayın</h2>
        </div>
        <button
          onClick={onClose}
          className="size-10 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center"
          aria-label="Kapat"
        >
          <X className="size-5" />
        </button>
      </div>

      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        playsInline
        muted
      />

      {/* Frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[78%] aspect-[4/3] max-w-md">
          <Corner className="top-0 left-0" />
          <Corner className="top-0 right-0 rotate-90" />
          <Corner className="bottom-0 right-0 rotate-180" />
          <Corner className="bottom-0 left-0 -rotate-90" />
          <div className="absolute left-2 right-2 h-0.5 bg-[oklch(0.62_0.19_255)] shadow-[0_0_18px_oklch(0.62_0.19_255)] animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      </div>

      {(starting || error) && (
        <div className="absolute inset-x-0 bottom-32 flex justify-center px-6">
          <div className="bg-white/10 backdrop-blur-xl text-white rounded-2xl px-5 py-3 flex items-center gap-3 max-w-sm">
            {starting && !error ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Kamera başlatılıyor…</span>
              </>
            ) : (
              <>
                <CameraIcon className="size-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photo recognition CTA */}
      {onPhotoCaptured && !error && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2">
          <button
            onClick={handleCapture}
            disabled={capturing || starting}
            className="rounded-full bg-white text-black font-semibold px-6 py-3 flex items-center gap-2 shadow-xl disabled:opacity-60"
          >
            {capturing ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
            <span>Fotoğraftan tanı</span>
          </button>
          <p className="text-white/70 text-xs">Barkod yoksa ürünü AI ile tanıyalım</p>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 8%; opacity: 0.5; }
          50% { top: 92%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute size-8 border-t-[3px] border-l-[3px] border-white rounded-tl-xl ${className}`}
    />
  );
}
