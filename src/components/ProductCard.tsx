import { useState } from "react";
import { ChevronDown, MapPin, TrendingDown, Leaf, Store, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Market = { name: string; price: number; distance: number; isBest?: boolean };

export type Product = {
  name: string;
  brand: string;
  image: string;
  bestPrice: number;
  currency: string;
  markets: Market[];
  novaGroup: 1 | 2 | 3 | 4;
  nutriScore: "A" | "B" | "C" | "D" | "E";
  healthScore: number;
  nutrients: { label: string; value: string; level: "low" | "med" | "high" }[];
};

const nutriColors: Record<Product["nutriScore"], string> = {
  A: "bg-[oklch(0.72_0.18_150)]",
  B: "bg-[oklch(0.78_0.16_120)]",
  C: "bg-[oklch(0.82_0.16_90)]",
  D: "bg-[oklch(0.75_0.18_50)]",
  E: "bg-[oklch(0.65_0.22_27)]",
};

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const best = product.markets.find((m) => m.isBest) ?? product.markets[0];
  const novaText = t(`nova.${product.novaGroup}`);

  return (
    <div className="rounded-3xl bg-card shadow-[var(--shadow-card)] overflow-hidden border border-border/50">
      {/* Header with product */}
      <div className="p-5 flex gap-4 items-center">
        <div className="size-20 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          <img src={product.image} alt={product.name} className="size-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.brand}</p>
          <h3 className="font-display font-semibold text-base leading-tight truncate">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{novaText} • NOVA {product.novaGroup}</p>
        </div>
      </div>

      {/* Dual gradient strip */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {/* Price card */}
        <div
          className="rounded-2xl p-4 text-primary-foreground relative overflow-hidden"
          style={{ background: "var(--gradient-price)" }}
        >
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <TrendingDown className="size-3.5" />
            <span>{t("card.bestPrice")}</span>
          </div>
          <p className="font-display font-bold text-2xl mt-1 leading-none">
            {product.bestPrice.toFixed(2)}
            <span className="text-sm font-medium ml-0.5">{product.currency}</span>
          </p>
          <p className="text-xs opacity-90 mt-2 truncate">{best.name}</p>
        </div>

        {/* Health card */}
        <div
          className="rounded-2xl p-4 text-primary-foreground relative overflow-hidden"
          style={{ background: "var(--gradient-health)" }}
        >
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <Leaf className="size-3.5" />
            <span>{t("card.healthScore")}</span>
          </div>
          <div className="flex items-end gap-2 mt-1">
            <p className="font-display font-bold text-2xl leading-none">{product.healthScore}</p>
            <span className="text-xs opacity-90 mb-0.5">/100</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn("size-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white", nutriColors[product.nutriScore])}>
              {product.nutriScore}
            </span>
            <span className="text-xs opacity-90">Nutri-Score</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 border-t border-border/60 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? t("card.collapse") : t("card.expand")}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {/* Expanded details */}
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-5">
            {/* Markets list */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("card.markets")}</p>
              <div className="space-y-2">
                {product.markets.map((m) => (
                  <div
                    key={m.name}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl",
                      m.isBest ? "bg-[oklch(0.97_0.05_155)] ring-1 ring-[oklch(0.7_0.17_155)]/30" : "bg-secondary/60"
                    )}
                  >
                    <div className="size-8 rounded-lg bg-card flex items-center justify-center">
                      <Store className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="size-3" />
                        <span>{m.distance.toFixed(1)} km</span>
                      </div>
                    </div>
                    <p className="font-display font-semibold text-sm">
                      {m.price.toFixed(2)} {product.currency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nutrient breakdown */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Besin değerleri (100g)</p>
              <div className="grid grid-cols-2 gap-2">
                {product.nutrients.map((n) => (
                  <div key={n.label} className="p-3 rounded-xl bg-secondary/60">
                    <p className="text-xs text-muted-foreground">{n.label}</p>
                    <p className="font-display font-semibold text-sm mt-0.5">{n.value}</p>
                    <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          n.level === "low" && "w-1/3 bg-success",
                          n.level === "med" && "w-2/3 bg-warning",
                          n.level === "high" && "w-full bg-danger"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-2">
              <MapPin className="size-4" />
              {best.name} yol tarifi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
