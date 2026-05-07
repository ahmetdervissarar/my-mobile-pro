import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  barcode: z.string().min(4).max(32).regex(/^[0-9A-Za-z]+$/),
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
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_tr,brands,image_front_url,image_url,nova_group,nutriscore_grade,nutriments`,
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
  };
}

export const lookupAndCacheProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const { barcode } = data;

    // 1. Try cache
    const { data: cached } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    let product = cached;

    // 2. Fallback to OpenFoodFacts + cache
    if (!product) {
      const off = await fetchFromOFF(barcode);
      if (!off) return { product: null, prices: [] as any[] };

      const { data: inserted } = await supabaseAdmin
        .from("products")
        .upsert({ barcode, ...off, updated_at: new Date().toISOString() })
        .select()
        .single();
      product = inserted;

      // Seed deterministic prices for all markets
      const { data: markets } = await supabaseAdmin.from("markets").select("id");
      if (markets?.length) {
        const hash = [...barcode].reduce((a, c) => a + c.charCodeAt(0), 0);
        const basePrice = 8 + (hash % 60);
        const rows = markets.map((m, i) => ({
          barcode,
          market_id: m.id,
          price: +(basePrice * (1 + ((((hash * (i + 1)) % 23) - 11) / 100))).toFixed(2),
          currency: "TRY",
        }));
        await supabaseAdmin.from("product_prices").upsert(rows, { onConflict: "barcode,market_id" });
      }
    }

    // 3. Get prices joined with markets
    const { data: prices } = await supabaseAdmin
      .from("product_prices")
      .select("price, currency, markets(id, chain, name, latitude, longitude)")
      .eq("barcode", barcode);

    return { product, prices: prices ?? [] };
  });
