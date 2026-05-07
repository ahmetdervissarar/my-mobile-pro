import type { Product } from "@/components/ProductCard";

type OFFProduct = {
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  nova_group?: number;
  nutriscore_grade?: string;
  nutriments?: Record<string, number>;
};

const novaClamp = (n?: number): Product["novaGroup"] => {
  const v = Math.min(4, Math.max(1, Math.round(n ?? 3)));
  return v as Product["novaGroup"];
};

const nutriClamp = (g?: string): Product["nutriScore"] => {
  const u = (g ?? "c").toUpperCase();
  return (["A", "B", "C", "D", "E"].includes(u) ? u : "C") as Product["nutriScore"];
};

const scoreFrom = (nutri: Product["nutriScore"], nova: Product["novaGroup"]) => {
  const nutriPts = { A: 50, B: 40, C: 30, D: 18, E: 8 }[nutri];
  const novaPts = { 1: 50, 2: 38, 3: 22, 4: 8 }[nova];
  return nutriPts + novaPts;
};

const fmt = (n?: number, unit = "g") =>
  n == null ? "—" : `${n < 10 ? n.toFixed(1) : Math.round(n)} ${unit}`;

const lvl = (v: number | undefined, low: number, high: number): "low" | "med" | "high" => {
  if (v == null) return "low";
  if (v <= low) return "low";
  if (v >= high) return "high";
  return "med";
};

// Simulated nearby market prices around a base price
const generateMarkets = (basePrice: number): Product["markets"] => {
  const stores = [
    { name: "BİM", spread: -0.05, distance: 0.4 },
    { name: "A101", spread: 0.03, distance: 0.7 },
    { name: "Migros", spread: 0.12, distance: 1.2 },
    { name: "ŞOK", spread: 0.0, distance: 1.6 },
    { name: "CarrefourSA", spread: 0.18, distance: 2.3 },
  ];
  const items = stores.map((s) => ({
    name: `${s.name} Şubesi`,
    price: Math.max(1, +(basePrice * (1 + s.spread)).toFixed(2)),
    distance: s.distance,
  }));
  const min = Math.min(...items.map((i) => i.price));
  return items
    .map((i) => ({ ...i, isBest: i.price === min }))
    .sort((a, b) => a.price - b.price);
};

export async function lookupProduct(barcode: string): Promise<Product | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_tr,brands,image_front_url,image_url,nova_group,nutriscore_grade,nutriments`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { status: number; product?: OFFProduct };
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const nova = novaClamp(p.nova_group);
  const nutri = nutriClamp(p.nutriscore_grade);
  const n = p.nutriments ?? {};

  // Estimate base price from a deterministic hash of barcode (5–80 ₺)
  const hash = [...barcode].reduce((a, c) => a + c.charCodeAt(0), 0);
  const basePrice = +(8 + (hash % 60) + Math.random() * 4).toFixed(2);

  return {
    name: p.product_name_tr || p.product_name || "İsimsiz ürün",
    brand: (p.brands ?? "Bilinmeyen marka").split(",")[0].trim(),
    image:
      p.image_front_url ||
      p.image_url ||
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
    bestPrice: basePrice,
    currency: "₺",
    novaGroup: nova,
    nutriScore: nutri,
    healthScore: scoreFrom(nutri, nova),
    markets: generateMarkets(basePrice),
    nutrients: [
      { label: "Enerji", value: fmt(n["energy-kcal_100g"], "kcal"), level: lvl(n["energy-kcal_100g"], 150, 350) },
      { label: "Yağ", value: fmt(n.fat_100g), level: lvl(n.fat_100g, 3, 17) },
      { label: "Şeker", value: fmt(n.sugars_100g), level: lvl(n.sugars_100g, 5, 22) },
      { label: "Tuz", value: fmt(n.salt_100g), level: lvl(n.salt_100g, 0.3, 1.5) },
    ],
  };
}
