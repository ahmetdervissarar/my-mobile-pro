import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, History, User, Home as HomeIcon, ScanLine } from "lucide-react";
import { ScannerHero } from "@/components/ScannerHero";
import { ProductCard, type Product } from "@/components/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skanr — Ürün tara, fiyat & sağlık puanı al" },
      { name: "description", content: "Barkod veya görsel ile ürünü tarayın. En uygun market fiyatını, mesafeyi ve NOVA + Nutri-Score sağlık puanını anında öğrenin." },
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

function Index() {
  const [scanned, setScanned] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Merhaba 👋</p>
            <h1 className="font-display font-bold text-xl">Bugün ne tarıyorsun?</h1>
          </div>
          <div className="size-11 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border">
            <User className="size-5" />
          </div>
        </header>

        {/* Scanner */}
        <ScannerHero onScan={() => setScanned(true)} />

        {/* Section title */}
        <div className="flex items-center gap-2 mt-8 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            {scanned ? "Tarama sonucu" : "Son taramalar"}
          </h2>
        </div>

        {/* Result card */}
        <ProductCard product={sampleProduct} />

        {/* Tip */}
        <div className="mt-6 p-4 rounded-2xl bg-secondary/70 border border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">İpucu</p>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
            Karta dokunarak market listesini, mesafeleri ve detaylı besin değerlerini görebilirsin.
          </p>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-md px-5 pb-5">
          <div className="rounded-full bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevated)] border border-border/60 flex items-center justify-around py-3 px-2">
            <NavItem icon={<HomeIcon className="size-5" />} label="Ana" active />
            <NavItem icon={<History className="size-5" />} label="Geçmiş" />
            <button
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
