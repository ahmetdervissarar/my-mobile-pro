ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS allergens text[],
  ADD COLUMN IF NOT EXISTS ingredients_text text;