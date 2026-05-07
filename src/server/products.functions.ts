import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  barcode: z.string().min(4).max(32).regex(/^[0-9A-Za-z]+$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  distanceKm: z.number().min(1).max(50).optional(),
});

type OFFProduct = {
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  nova_group?: number;
  nutriscore_grade?: string;
  nutriments?: Record<string, number>;
  allergens_tags?: string[];
  ingredients_text?: string;
  ingredients_text_tr?: string;
};

const novaClamp = (n?: number) => Math.min(4, Math.max(1, Math.round(n ?? 3)));
const nutriClamp = (g?: string) => {
  const u = (g ?? "c").toUpperCase();
  return ["A", "B", "C", "D", "E"].includes(u) ? u : "C";
};
const scoreFrom = (nutri: string, nova: number) => {
  const nutriPts = ({ A: 50, B: 40, C: 30, D: 18, E: 8 } as Record<string, number>)[nutri];
  const novaPts = ({ 1: 50, 2: 38, 3: 22, 4: 8 } as Record<number, number>)[nova];
  return nutriPts + novaPts;
};

async function fetchFromOFF(barcode: string) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_tr,brands,image_front_url,image_url,nova_group,nutriscore_grade,nutriments,allergens_tags,ingredients_text,ingredients_text_tr`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { status: number; product?: OFFProduct };
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const nova = novaClamp(p.nova_group);
  const nutri = nutriClamp(p.nutriscore_grade);
  const n = p.nutriments ?? {};

  return {
    name: p.product_name_tr || p.product_name || "İsimsiz ürün",
    brand: (p.brands ?? "Bilinmeyen marka").split(",")[0].trim(),
    image_url:
      p.image_front_url ||
      p.image_url ||
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
    nova_group: nova,
    nutri_score: nutri,
    health_score: scoreFrom(nutri, nova),
    energy_kcal: n["energy-kcal_100g"] ?? null,
    fat_g: n.fat_100g ?? null,
    sugars_g: n.sugars_100g ?? null,
    salt_g: n.salt_100g ?? null,
    allergens: p.allergens_tags ?? [],
    ingredients_text: p.ingredients_text_tr || p.ingredients_text || null,
  };
}

// ============================================================
// Marketfiyatı (T.C. Ticaret Bakanlığı destekli açık veri)
// ============================================================
const MF_BASE = "https://api.marketfiyati.org.tr";
const MF_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Origin: "https://marketfiyati.org.tr",
  Referer: "https://marketfiyati.org.tr/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

type MFDepotInfo = {
  depotId: string;
  depotName: string;
  price: number;
  unitPrice?: string;
  marketAdi: string;
  longitude: number;
  latitude: number;
  indexTime?: string;
};
type MFProduct = {
  id: string;
  title: string;
  brand?: string;
  imageUrl?: string;
  productDepotInfoList: MFDepotInfo[];
};
type MFSearchResponse = {
  numberOfFound: number;
  content: MFProduct[];
};

async function mfSearch(keywords: string, latitude: number, longitude: number, distance: number) {
  try {
    const res = await fetch(`${MF_BASE}/api/v2/search`, {
      method: "POST",
      headers: MF_HEADERS,
      body: JSON.stringify({
        keywords,
        pages: 0,
        size: 24,
        latitude,
        longitude,
        distance,
      }),
    });
    if (!res.ok) {
      console.error(`Marketfiyati API ${res.status} for "${keywords}"`);
      return null;
    }
    return (await res.json()) as MFSearchResponse;
  } catch (e) {
    console.error("Marketfiyati fetch error:", e);
    return null;
  }
}

type PriceRow = {
  marketChain: string;
  marketName: string;
  price: number;
  unitPrice?: string;
  latitude: number;
  longitude: number;
  productTitle?: string;
  productImage?: string;
};

function flattenPrices(resp: MFSearchResponse | null): PriceRow[] {
  if (!resp || !resp.content?.length) return [];
  const rows: PriceRow[] = [];
  for (const p of resp.content) {
    for (const d of p.productDepotInfoList ?? []) {
      rows.push({
        marketChain: d.marketAdi,
        marketName: d.depotName,
        price: d.price,
        unitPrice: d.unitPrice,
        latitude: d.latitude,
        longitude: d.longitude,
        productTitle: p.title,
        productImage: p.imageUrl,
      });
    }
  }
  return rows;
}

export const lookupAndCacheProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const { barcode } = data;
    // Default: Ankara center, 25km — works for any Turkish city
    const lat = data.latitude ?? 39.9255;
    const lon = data.longitude ?? 32.8663;
    const dist = data.distanceKm ?? 25;

    // 1. Try product cache (Open Food Facts data)
    const { data: cached } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    let product = cached;

    // 2. Fallback to OpenFoodFacts + cache
    if (!product) {
      const off = await fetchFromOFF(barcode);
      if (!off) return { product: null, prices: [] as PriceRow[], source: "none" as const };

      const { data: inserted } = await supabaseAdmin
        .from("products")
        .upsert({ barcode, ...off, updated_at: new Date().toISOString() })
        .select()
        .single();
      product = inserted;
    }

    // 3. Live price lookup from Marketfiyatı.org.tr
    // Try barcode first (rarely indexed), then product name + brand
    let prices: PriceRow[] = [];
    let resp = await mfSearch(barcode, lat, lon, dist);
    prices = flattenPrices(resp);

    if (prices.length === 0 && product?.name) {
      const query = product.brand
        ? `${product.brand} ${product.name}`.slice(0, 80)
        : product.name.slice(0, 80);
      resp = await mfSearch(query, lat, lon, dist);
      prices = flattenPrices(resp);
    }

    // Fallback: try just the product name without brand
    if (prices.length === 0 && product?.name) {
      resp = await mfSearch(product.name.split(" ").slice(0, 3).join(" "), lat, lon, dist);
      prices = flattenPrices(resp);
    }

    return { product, prices, source: prices.length > 0 ? ("live" as const) : ("none" as const) };
  });
