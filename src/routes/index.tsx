import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, History, User, Home as HomeIcon, ScanLine, Loader2, AlertCircle, MapPin } from "lucide-react";
import { ScannerHero } from "@/components/ScannerHero";
import { ProductCard, type Product } from "@/components/ProductCard";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { HealthWarning } from "@/components/HealthWarning";
import { lookupAndCacheProduct } from "@/server/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm, getCurrentLocation, type Coords } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { useHealthProfile, evaluateRisk, normalizeAllergens, vibrateWarning, type RiskResult } from "@/lib/health-profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skanr — Scan, compare prices & health" },
      { name: "description", content: "Scan a barcode to get the cheapest nearby market and a personalized health score with allergen + chronic-condition warnings." },
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
    { label: "Energy", value: "238 kcal", level: "low" },
    { label: "Fat", value: "1.8 g", level: "low" },
    { label: "Sugar", value: "2.1 g", level: "low" },
    { label: "Salt", value: "1.1 g", level: "med" },
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
  const { t, dir } = useI18n();
  const { profile } = useHealthProfile();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [product, setProduct] = useState<Product>(sampleProduct);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "asking" | "ok" | "denied">("idle");
  const [risk, setRisk] = useState<RiskResult | null>(null);

  useEffect(() => {
    setLocStatus("asking");
    getCurrentLocation()
      .then((c) => { setCoords(c); setLocStatus("ok"); })
      .catch(() => setLocStatus("denied"));
  }, []);

  // Localized nutrient labels for the sample / loaded product
  const localizedNutrients = (energy: number | null, fat: number | null, sugar: number | null, salt: number | null) => [
    { label: t("nutri.energy"), value: fmt(energy, "kcal"), level: lvl(energy, 150, 350) },
    { label: t("nutri.fat"), value: fmt(fat), level: lvl(fat, 3, 17) },
    { label: t("nutri.sugar"), value: fmt(sugar), level: lvl(sugar, 5, 22) },
    { label: t("nutri.salt"), value: fmt(salt), level: lvl(salt, 0.3, 1.5) },
  ];

  const runLookup = useCallback(
    async (args: { barcode?: string; query?: string; label?: string }) => {
      setLoading(true);
      setError(null);
      setRisk(null);
      try {
        const ref = coords ?? { latitude: 39.9255, longitude: 32.8663 };
        const { product: p, prices } = await lookupAndCacheProduct({
          data: {
            barcode: args.barcode,
            query: args.query,
            latitude: ref.latitude,
            longitude: ref.longitude,
            distanceKm: 25,
          },
        });
        if (!p) {
          setError(t("result.notFound"));
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
          nutrients: localizedNutrients(p.energy_kcal, p.fat_g, p.sugars_g, p.salt_g),
        });

        const productAllergens = normalizeAllergens(p.allergens);
        const r = evaluateRisk(profile, productAllergens, {
          sugars_g: p.sugars_g,
          salt_g: p.salt_g,
          fat_g: p.fat_g,
          energy_kcal: p.energy_kcal,
          novaGroup: nova,
        });
        setRisk(r);
        if (r.hasRisk) vibrateWarning();
      } catch (e) {
        console.error(e);
        setError(t("result.error"));
      } finally {
        setLoading(false);
      }
    },
    [coords, profile, t],
  );

  const handleDetected = useCallback(
    async (code: string) => {
      setScannerOpen(false);
      setLastCode(code);
      await runLookup({ barcode: code });
    },
    [runLookup],
  );

  const handlePhotoCaptured = useCallback(
    async (imageBase64: string, mimeType: string) => {
      setScannerOpen(false);
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("recognize-product", {
          body: { imageBase64, mimeType },
        });
        if (fnErr || !data) throw fnErr ?? new Error("recognize failed");
        const barcode: string | undefined = data.barcode && /^[0-9]{6,}$/.test(data.barcode) ? data.barcode : undefined;
        const query: string | undefined = data.searchQuery || [data.brand, data.productName].filter(Boolean).join(" ");
        setLastCode(barcode ?? `📷 ${data.productName ?? query ?? ""}`);
        await runLookup({ barcode, query });
      } catch (e) {
        console.error(e);
        setError(t("result.error"));
        setLoading(false);
      }
    },
    [runLookup, t],
  );

  return (
    <div className="min-h-screen bg-background pb-24" dir={dir}>
      <div className="mx-auto max-w-md px-5 pt-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">{t("app.greeting")}</p>
            <h1 className="font-display font-bold text-xl">{t("app.tagline")}</h1>
          </div>
          <Link
            to="/profile"
            className="size-11 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border hover:bg-accent transition"
            aria-label={t("nav.profile")}
          >
            <User className="size-5" />
          </Link>
        </header>

        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/70 border border-border/60 text-xs">
          <MapPin className="size-3.5 text-primary" />
          {locStatus === "ok" && <span className="text-foreground">{t("loc.active")}</span>}
          {locStatus === "asking" && <span className="text-muted-foreground">{t("loc.asking")}</span>}
          {locStatus === "denied" && (
            <button
              onClick={() => { setLocStatus("asking"); getCurrentLocation().then((c) => { setCoords(c); setLocStatus("ok"); }).catch(() => setLocStatus("denied")); }}
              className="text-primary font-medium"
            >
              {t("loc.allow")}
            </button>
          )}
        </div>

        <ScannerHero onScan={() => setScannerOpen(true)} />

        <div className="flex items-center gap-2 mt-8 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            {lastCode ? t("result.title") : t("result.sample")}
          </h2>
          {lastCode && (
            <span className="ms-auto text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {lastCode}
            </span>
          )}
        </div>

        {risk && <HealthWarning risk={risk} onDismiss={() => setRisk(null)} />}

        {loading ? (
          <div className="rounded-3xl bg-card border border-border/50 p-10 flex flex-col items-center justify-center gap-3 shadow-[var(--shadow-card)]">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("result.loading")}</p>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("src.title")}</p>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{t("src.body")}</p>
        </div>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-md px-5 pb-5">
          <div className="rounded-full bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevated)] border border-border/60 flex items-center justify-around py-3 px-2">
            <NavItem icon={<HomeIcon className="size-5" />} label={t("nav.home")} active />
            <NavItem icon={<History className="size-5" />} label={t("nav.history")} />
            <button
              onClick={() => setScannerOpen(true)}
              className="-mt-8 size-14 rounded-full text-primary-foreground flex items-center justify-center shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-scan)" }}
              aria-label={t("scan.start")}
            >
              <ScanLine className="size-6" />
            </button>
            <NavItem icon={<Sparkles className="size-5" />} label={t("nav.discover")} />
            <Link to="/profile" className="flex flex-col items-center gap-0.5 px-2 text-muted-foreground hover:text-foreground transition">
              <User className="size-5" />
              <span className="text-[10px] font-medium">{t("nav.profile")}</span>
            </Link>
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
