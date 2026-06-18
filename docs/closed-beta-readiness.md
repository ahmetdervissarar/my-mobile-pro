# RafSkoru Closed Beta Readiness Plan

This document tracks the remaining technical and product work before a controlled closed beta.

## Current safe checkpoint

Latest safe checkpoint:

- `9fe07cf docs(backend): document seed migration guardrails`

Validated state:

- Backend check passed.
- Backend smoke passed.
- Canonical alternatives smoke passed.
- Manual canonical parity passed.
- Mobile TypeScript check passed.
- Repo is clean and synced with `origin/main`.

## 1. Price data pipeline

Closed beta depends on usable price data. RafSkoru should not be evaluated as a meaningful product without a working price signal.

Current safe approach:

- Keep demo/manual/last-known price data clearly marked.
- Do not present beta prices as official live market prices.
- Prepare for Price2Spy/Tamara API integration when the crawl analysis result is available.
- Preserve fallback behavior when price data is unavailable.

Beta requirement:

- Product result should either show usable price data or clearly explain that price data is unavailable.
- Price confidence/source should remain visible or traceable.

## 2. Unknown product and incomplete data behavior

The app must fail safely when product data is missing.

Required behavior:

- Unknown barcode must not show mock product data.
- Unknown barcode must not leak mock allergens, mock image, or mock product name.
- Product result should clearly say product not found or RafSkoru cannot be calculated.
- Missing group or missing package size must suppress alternatives.

## 3. Alternative recommendation safety

Same-product-group alternatives and healthier swaps must remain separate concepts.

Current safe state:

- Seed `productGroupKey` remains legacy composite, such as `milk_1l` and `chips_100g`.
- Structured `packageSize` is present on seed candidates.
- Canonical matching remains behind `USE_CANONICAL_ALTERNATIVE_MATCHING`.
- Seed migration must not be done until matcher strategy and test contracts are changed.

Closed beta rule:

- Milk should only suggest milk alternatives.
- Chips should only suggest chips alternatives.
- Kefir, crackers, oat bars, and other cross-group products must not appear in the same-product-group alternative card.
- If product group cannot be resolved confidently, the alternative card must fail closed.

## 4. Result screen clarity

Closed beta users should understand why the product received its score.

Needed improvements:

- Keep the main RafSkoru score prominent.
- Show price score and health score separately.
- Keep allergen/critical warning cards above lower-priority explanation.
- Add clear beta disclaimers where needed.
- Explain that prices and product data may be incomplete during beta.

## 5. Beta feedback and logging

Closed beta should produce useful learning, not only app usage.

Needed decisions:

- Which queries should be logged?
- Which failures should be logged?
- How should users report wrong product, wrong price, or wrong alternative?
- Should beta feedback be collected inside the app or externally through a form?

Candidate feedback categories:

- Product not found.
- Wrong product matched.
- Price missing or wrong.
- Alternative recommendation wrong.
- Allergen/content warning unclear.
- RafSkoru explanation unclear.

## 6. Legal and trust disclaimers

The app should avoid overclaiming during beta.

Required disclaimer areas:

- RafSkoru is not medical advice.
- Allergen warnings are assistive; product label remains the primary source.
- Prices may be delayed, incomplete, or beta/reference data.
- RafSkoru is an aid for comparison, not an official certification.

## Next recommended technical steps

1. Add beta disclaimer copy to product result screen.
2. Add or review price source/confidence display.
3. Add feedback/report issue entry point for closed beta.
4. Re-test real device flow on home Wi-Fi with canonical matching enabled.
5. Wait for Price2Spy/Tamara crawl analysis before committing to live price integration details.
