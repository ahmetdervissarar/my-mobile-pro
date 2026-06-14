# ADR-001: Single Stack and Data Sources Decision

## Status

Accepted

## Decision

RafSkoru'nun ana ürünü Expo + React Native mobil uygulama ve Express + TypeScript backend olarak devam edecektir.

Kökte bulunan Skanr/web stack aktif geliştirme dışında tutulacaktır. Bu yapı yalnızca referans/arşiv olarak değerlendirilecektir.

## Main Product

- Mobile: Expo + React Native + TypeScript
- Backend: Express + TypeScript
- Main user flow: barcode scan -> backend lookup -> product, price, score and warnings

## Frozen / Archived Stack

Skanr/web stack kapalı beta kapsamına dahil değildir.

Bu taraftan yalnızca fikir olarak incelenebilecek konular:

- price data model
- products / markets / product_prices schema idea
- cache logic
- future photo recognition ideas
- selected UI ideas

Skanr/web tarafındaki Marketfiyati.org.tr, Supabase or Gemini flows ana ürüne doğrudan taşınmayacaktır.

## Product Facts Sources

Product and content data lookup order:

1. Open Food Facts
2. RafSkoru verified product facts database
3. Missing data state

Open Food Facts is the primary source for product name, image, ingredients, allergens, additives, nutrition values, Nutri-Score and NOVA when available.

If Open Food Facts data is missing, the product will be added to a missing product facts queue.

Excel is not a runtime source. Excel is only a human verification queue. Verified data will later be imported into a runtime datastore such as JSON, SQLite or Postgres.

## Scoring Rules

If ingredients text is missing, health/content scoring will not be performed.

Nutri-Score:

- Use Open Food Facts Nutri-Score if available.
- If Nutri-Score is missing but nutrition values are available, backend may calculate it using the official method.
- If nutrition values are missing, Nutri-Score will not be calculated.

NOVA:

- Use Open Food Facts NOVA if available.
- If NOVA is missing but ingredients text is available, backend may estimate it with rule-based logic and confidence.
- If ingredients text is missing, NOVA will not be estimated.

## Price Data Sources

Price data will be handled separately from product facts.

Potential price sources:

- Tamara / Price2Spy
- REM People
- manual beta prices
- last-known cache

All price providers must later map to a normalized PriceOffer contract.

Camgoz / JoJ will not be used.

Marketfiyati.org.tr will not be used in the main product.

## Closed Beta Privacy Decision

Closed beta will not require user accounts.

Allergen, chronic sensitivity and health preference profile data will stay on the device.

Backend will not store user health profile data.

Backend may return product data, price data, general scores and missing data status.

Personalized allergen and sensitivity warnings will be calculated on the mobile device.

Location may be used for instant nearby price or distance calculation, but should not be stored by backend.

## Closed Beta Goal

The minimum closed beta product is:

- barcode scan
- product name and image
- real, verified, manual beta or last-known price
- health/content/allergen result when enough data exists
- critical allergen warning
- missing data state when data is insufficient
- partial RafSkoru when price or product facts are missing

## Notes

The goal is:

- one product
- one stack
- one backend contract
- one barcode flow
- simple and reliable closed beta