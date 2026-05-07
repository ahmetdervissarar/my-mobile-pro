import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, History, User, Home as HomeIcon, ScanLine, Loader2, AlertCircle, MapPin } from "lucide-react";
import { ScannerHero } from "@/components/ScannerHero";
import { ProductCard, type Product } from "@/components/ProductCard";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { lookupAndCacheProduct } from "@/server/products.functions";
import { distanceKm, getCurrentLocation, type Coords } from "@/lib/geo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skanr — Ürün tara, fiyat & sağlık puanı al" },
      { name: "description", content: "Barkod ile ürünü tarayın. En yakın ve en uygun fiyatlı marketi, NOVA + Nutri-Score sağlık puanını anında öğrenin." },
    ],
  }),
  component: Index,
});

const sampleProduct: Product = {
  name: "Tam Buğday Kepekli Ekmek",
  brand: "Eker",
  image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  bestPrice: 24.9,
  currency: "₺",
  novaGroup: 2,
  nutriScore: "A",
  healthScore: 86,
  markets: [
    { name: "BİM Bağdat Cd.", price: 24.9, distance: 0.4, isBest: true },
    { name: "A101 Kadıköy", price: 26.5, distance: 0.7 },
    { name: "Migros Caddebostan", price: 28.75, distance: 1.2 },
    { name: "ŞOK Fener", price: 25.95, distance: 1.6 },
  ],
  nutrients: [
    { label: "Enerji", value: "238 kcal", level: "low" },
    { label: "Yağ", value: "1.8 g", level: "low" },
    { label: "Şeker", value: "2.1 g", level: "low" },
    { label: "Tuz", value: "1.1 g", level: "med" },
  ],
};

const fmt = (n: number | null, unit = "g") =>
  n == null ? "—" : `${n < 10 ? n.toFixed(1) : Math.round(n)} ${unit}`;
const lvl = (v: number | null, low: number, high: number): "low" | "med" | "high" => {
  if (v == null) return "low";
  if (v <= low) return "low";
  if (v >= high) return "high";
  return "med";
};

function Index() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [product, setProduct] = useState<Product>(sampleProduct);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "asking" | "ok" | "denied">("idle");

  // Ask location on mount (non-blocking)
  useEffect(() => {
    setLocStatus("asking");
    getCurrentLocation()
      .then((c) => {
        setCoords(c);
        setLocStatus("ok");
      })
      .catch(() => setLocStatus("denied"));
  }, []);

  const handleDetected = useCallback(
    async (code: string) => {
      setScannerOpen(false);
      setLastCode(code);
      setLoading(true);
      setError(null);
      try {
        const ref = coords ?? { latitude: 39.9255, longitude: 32.8663 }; // Ankara fallback (Türkiye merkezi)
        const { product: p, prices } = await lookupAndCacheProduct({
          data: {
            barcode: code,
            latitude: ref.latitude,
            longitude: ref.longitude,
            distanceKm: 25,
          },
        });
        if (!p) {
          setError(`Barkod ${code} için ürün bulunamadı.`);
          setLoading(false);
          return;
        }

        const marketRows = prices
          .map((row) => ({
            name: `${row.marketChain.toUpperCase()} • ${row.marketName}`,
            price: row.price,
            distance: distanceKm(ref.latitude, ref.longitude, row.latitude, row.longitude),
          }))
          .sort((a, b) => a.distance - b.distance);

        const bestPrice = marketRows.length ? Math.min(...marketRows.map((m) => m.price)) : 0;
        const markets = marketRows.map((m) => ({ ...m, isBest: m.price === bestPrice }));

        const nutri = (p.nutri_score ?? "C") as Product["nutriScore"];
        const nova = (p.nova_group ?? 3) as Product["novaGroup"];

        setProduct({
          name: p.name,
          brand: p.brand ?? "—",
          image: p.image_url ?? sampleProduct.image,
          bestPrice,
          currency: "₺",
          novaGroup: nova,
          nutriScore: nutri,
          healthScore: p.health_score ?? 50,
          markets,
          nutrients: [
            { label: "Enerji", value: fmt(p.energy_kcal, "kcal"), level: lvl(p.energy_kcal, 150, 350) },
            { label: "Yağ", value: fmt(p.fat_g), level: lvl(p.fat_g, 3, 17) },
            { label: "Şeker", value: fmt(p.sugars_g), level: lvl(p.sugars_g, 5, 22) },
            { label: "Tuz", value: fmt(p.salt_g), level: lvl(p.salt_g, 0.3, 1.5) },
          ],
        });
      } catch (e) {
        console.error(e);
        setError("Ürün bilgisi alınamadı. Bağlantınızı kontrol edin.");
      } finally {
        setLoading(false);
      }
    },
    [coords],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Merhaba 👋</p>
            <h1 className="font-display font-bold text-xl">Bugün ne tarıyorsun?</h1>
          </div>
          <div className="size-11 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border">
            <User className="size-5" />
          </div>
        </header>

        {/* Location chip */}
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/70 border border-border/60 text-xs">
          <MapPin className="size-3.5 text-primary" />
          {locStatus === "ok" && <span className="text-foreground">Konum aktif • mesafeler güncel</span>}
          {locStatus === "asking" && <span className="text-muted-foreground">Konum alınıyor…</span>}
          {locStatus === "denied" && (
            <button onClick={() => { setLocStatus("asking"); getCurrentLocation().then((c) => { setCoords(c); setLocStatus("ok"); }).catch(() => setLocStatus("denied")); }} className="text-primary font-medium">
              Konum izni ver
            </button>
          )}
        </div>

        <ScannerHero onScan={() => setScannerOpen(true)} />

        <div className="flex items-center gap-2 mt-8 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            {lastCode ? "Tarama sonucu" : "Örnek ürün"}
          </h2>
          {lastCode && (
            <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {lastCode}
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl bg-card border border-border/50 p-10 flex flex-col items-center justify-center gap-3 shadow-[var(--shadow-card)]">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Ürün aranıyor…</p>
          </div>
        ) : (
          <ProductCard product={product} />
        )}

        {error && (
          <div className="mt-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <p className="text-sm text-foreground/90">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 rounded-2xl bg-secondary/70 border border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Veri kaynakları</p>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
            Ürün bilgileri <strong>Open Food Facts</strong>'ten, canlı market fiyatları T.C. Ticaret Bakanlığı destekli <strong>marketfiyati.org.tr</strong> açık veri platformundan gelir. BİM, A101, Migros, ŞOK, CarrefourSA, Hakmar — Türkiye geneli şube bazlı.
          </p>
        </div>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-md px-5 pb-5">
          <div className="rounded-full bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevated)] border border-border/60 flex items-center justify-around py-3 px-2">
            <NavItem icon={<HomeIcon className="size-5" />} label="Ana" active />
            <NavItem icon={<History className="size-5" />} label="Geçmiş" />
            <button
              onClick={() => setScannerOpen(true)}
              className="-mt-8 size-14 rounded-full text-primary-foreground flex items-center justify-center shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-scan)" }}
              aria-label="Tara"
            >
              <ScanLine className="size-6" />
            </button>
            <NavItem icon={<Sparkles className="size-5" />} label="Keşfet" />
            <NavItem icon={<User className="size-5" />} label="Profil" />
          </div>
        </div>
      </nav>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetected}
      />
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-0.5 px-2 ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
