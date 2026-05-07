import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Loader2, Camera as CameraIcon } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
};

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        // Prefer back/environment camera
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
        <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
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
