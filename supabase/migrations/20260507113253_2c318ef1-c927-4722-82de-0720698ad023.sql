
-- Products cache (populated from OpenFoodFacts on first scan)
CREATE TABLE public.products (
  barcode TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  nova_group SMALLINT,
  nutri_score TEXT,
  health_score SMALLINT,
  energy_kcal NUMERIC,
  fat_g NUMERIC,
  sugars_g NUMERIC,
  salt_g NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Market locations (chain stores with geo coordinates)
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  district TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX markets_geo_idx ON public.markets (latitude, longitude);

-- Prices per product per market
CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barcode, market_id)
);

CREATE INDEX product_prices_barcode_idx ON public.product_prices(barcode);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Public read access (catalog data)
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT USING (true);
CREATE POLICY "Markets are viewable by everyone"
  ON public.markets FOR SELECT USING (true);
CREATE POLICY "Prices are viewable by everyone"
  ON public.product_prices FOR SELECT USING (true);

-- Public insert/update for product cache (community-populated catalog)
CREATE POLICY "Anyone can add products to catalog"
  ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product catalog"
  ON public.products FOR UPDATE USING (true);

CREATE POLICY "Anyone can add prices"
  ON public.product_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prices"
  ON public.product_prices FOR UPDATE USING (true);

-- Seed market locations (Istanbul examples)
INSERT INTO public.markets (chain, name, city, district, latitude, longitude) VALUES
  ('BİM', 'BİM Kadıköy Bağdat', 'İstanbul', 'Kadıköy', 40.9781, 29.0560),
  ('BİM', 'BİM Beşiktaş', 'İstanbul', 'Beşiktaş', 41.0422, 29.0083),
  ('A101', 'A101 Kadıköy Moda', 'İstanbul', 'Kadıköy', 40.9851, 29.0265),
  ('A101', 'A101 Şişli', 'İstanbul', 'Şişli', 41.0602, 28.9870),
  ('Migros', 'Migros Caddebostan', 'İstanbul', 'Kadıköy', 40.9667, 29.0683),
  ('Migros', 'Migros Nişantaşı', 'İstanbul', 'Şişli', 41.0498, 28.9889),
  ('ŞOK', 'ŞOK Fenerbahçe', 'İstanbul', 'Kadıköy', 40.9711, 29.0364),
  ('ŞOK', 'ŞOK Levent', 'İstanbul', 'Beşiktaş', 41.0790, 29.0124),
  ('CarrefourSA', 'CarrefourSA Maltepe', 'İstanbul', 'Maltepe', 40.9354, 29.1556),
  ('CarrefourSA', 'CarrefourSA Bakırköy', 'İstanbul', 'Bakırköy', 40.9799, 28.8728);
