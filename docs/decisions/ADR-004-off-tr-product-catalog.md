# ADR-004: OFF-TR In-Memory Product Catalog

Date: 2026-09-21
Status: Accepted

## Context

Before this change, `/api/search/suggest` only returned product-group suggestions (e.g. "süt" → `milk`). There was no per-product data behind search or the basket, so mobile always showed "veri yok" for score, allergen, Nutri-Score, and NOVA in search rows and basket rows.

`npm run import:off-tr` already produces `apps/backend/data/off-tr/products.jsonl` from Open Food Facts (Turkey-scoped), with GTIN, name, brand, quantity, OFF category tags, ingredients, allergen declaration/trace + `dataStatus`, Nutri-Score grade, NOVA group, per-100g nutrition, provenance, `missingFields`, and `completeness`. `src/nutriScore/nutriScore2023.ts` (Nutri-Score 2023 algorithm) was also already implemented and tested.

The goal of this task was to turn that JSONL into a usable product catalog for search and basket, without adding a database, a new package, or an external service call at request time.

## Decision

`apps/backend/src/catalog/catalog.ts` loads `products.jsonl` into memory once, at server startup (`loadCatalog(path)` called from `src/index.ts`). `getCatalog()` returns the current in-memory snapshot (`products: CatalogProduct[]`, `byId: Map<productId, CatalogProduct>`).

- If the file is missing or unreadable, the catalog stays empty and a warning is logged — no endpoint crashes or changes shape. This was verified with a fixture-based smoke test (`catalog.smoke.ts`) rather than depending on the real OFF-TR file being present.
- No database, ORM, or persistent cache was introduced. Reload only happens on server restart.
- Product group is assigned only from an explicit OFF category tag map (`productGroupMap.ts`), never inferred from the product name. Unmatched products get `productGroupKey: 'unclassified'`.
- Nutri-Score is computed by RafSkoru's own algorithm first (`source: 'rafskoru_computed'`); only when our computation reports `insufficient_data` and OFF has its own grade do we fall back to it (`source: 'off'`). NOVA is OFF-only or null — RafSkoru does not estimate NOVA in this task.
- OFF's allergen `dataStatus` (`present` / `not_listed_in_available_data` / `unknown_or_unverified`) is carried through unchanged at every layer (catalog → search/basket response → mobile chip). No layer ever turns a missing-data state into a "safe" or "contains" claim.

### Contract changes (additive only)

- `ProductSearchSuggestion` (search) and `BasketProfileItem` (basket) gained optional fields: `imageUrl`, `nutriScore`, `nova`, `allergenData`, `completeness`, `provenance` (search only), and `scoreSource` (basket only, `'product' | 'group_estimate' | 'none'`). No existing field was removed or renamed; all existing smoke tests pass unmodified.
- `scoreSource` labels where the *existing* basket score comes from — it does not change basket scoring logic. Today it is always `'group_estimate'` or `'none'`; `'product'` is defined for a future task that computes a real per-product score.
- Mobile types (`apps/mobile/src/api/catalogTypes.ts`) mirror the backend types by hand. A shared package between backend and mobile is out of scope for this task and remains a follow-up.

## Limits / pending work

- **In-memory only, single-process.** With multiple backend instances each would load its own copy from the same file; there is no shared cache. This is acceptable for the current single-instance beta deployment but not for horizontal scaling.
- **No incremental reload.** Picking up a re-run of `npm run import:off-tr` requires a server restart. A file-watcher or admin reload endpoint is future work.
- **Moving to a real database (SQLite/Postgres) is still a pending decision**, consistent with ADR-003's existing note that runtime product facts "should eventually live in JSON, SQLite, or Postgres." This task does not make that call; it only adds a JSONL-backed in-memory layer that a future migration can replace behind the same `getCatalog()`/`byId` interface.
- **`productGroupMap.ts` covers 24 of the 34 registry product groups.** Tags were only added when the author was confident they are real, current OFF taxonomy tags (several already used elsewhere in this codebase) or confirmed against the live OFF-TR dataset. The remaining groups (`lactose_free_milk` exclusion aside, e.g. `kefir`, `ayran`, `wafer`, `oat_bar`, `bulgur`, `tomato_paste`, `canned_tuna`, `sparkling_water`, `baby_formula`, `baby_cereal`, `baby_food`) were intentionally left unmapped rather than guessed, per the task's explicit rule against adding uncertain tags; their products fall to `unclassified` today. Expanding coverage is a follow-up once each tag is cross-checked against real OFF-TR category data.
- **OFF-TR import reliability.** `world.openfoodfacts.org/api/v2/search` returned intermittent `503`s during this task's data pull (see final report); the import script's own retry/backoff already handles transient failures, but a full 7-partition crawl can still fail partway through and needs to be re-run.
- **OFF's official `allergens.txt` taxonomy has no Turkish (`tr:`) language block at all** (verified 2026-09-22 against `raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/allergens.txt` — 0 lines starting with `tr:` out of 585). A taxonomy-driven synonym lookup therefore cannot resolve any Turkish-language allergen tag; it would only ever help genuine English-spelling variants (e.g. `en:egg` vs `en:eggs`), which do not occur in the current TR-scoped dataset.
- **`TR_ALLERGEN_SYNONYMS` (`offAllergenMap.ts`) is observation-based, not taxonomy- or regulation-derived.** Each entry was added because the exact normalized string was directly observed in the real OFF-TR import (`apps/backend/data/off-tr/products.jsonl`), with the occurrence count recorded in the entry's own comment — not because it was cross-checked against the Türk Gıda Kodeksi (TGK) Etiketleme Yönetmeliği text (that text was not fetched or verified in this task). Four entries (`yulaf`→gluten_wheat, `sodyum metabisülfit`→sulphites, `fıstık`→peanut+tree_nuts, `laktoz`→milk) are explicitly flagged in code as ambiguous cases resolved toward the more cautious/broader interpretation. **Before this allergen-tag surface is opened to a wider user base, a food-safety/regulatory expert should review `TR_ALLERGEN_SYNONYMS` against the actual TGK text**, not just against observed OFF data.
- **Barcodes not in the local catalog still fall through to the live single-product OFF fetch (`fetchOpenFoodFactsProductFactsByBarcode`), which is a separate, older code path with two known gaps** (P0-3 fixed the catalog-hit path only): (1) it still applies the `isComplete` gate, silently discarding a partial live result instead of showing what's there; (2) its allergen banner still goes through the old `getAllergenBannerData` (product-result.tsx / productResult/helpers.ts), which does **not** filter by the user's allergen profile at all — it shows "declared_contains" to every user if the product declares anything, regardless of what that user is actually allergic to. Both gaps are pre-existing and out of scope for P0-3; see the P2 backlog.

## Attribution

OFF data is licensed under ODbL. Per `provenance.license: 'ODbL-1.0'` carried on every catalog product, the product page's source line reads "Ürün analiz verisi: Open Food Facts (ODbL)" whenever `dataSource === 'off'` (`apps/mobile/app/product-result.tsx`). The product-contribution screen also names the ODbL license when asking for optional consent to share user-submitted photos back to OFF.

## Consequences

Search and basket can now show real per-product Nutri-Score, NOVA, and allergen data wherever the OFF-TR catalog has a match, without any new runtime dependency. Coverage is bounded by both the completeness of the OFF-TR pull and the current 24/34 category mapping — both are visible gaps to close incrementally rather than silent guesses.
