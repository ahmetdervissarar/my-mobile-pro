# ADR-003: ProductFacts Source Order and Verified Fallback Queue

Date: 2026-06-14
Status: Accepted

## Context

RafSkoru needs reliable product facts for health, content, allergen, Nutri-Score, NOVA, and sustainability-related scoring.

Open Food Facts is the first product facts source, but it may be incomplete for some Turkish grocery products.

The goal is not to continuously scrape or manually maintain every product. The goal is to detect products that are missing or incomplete in Open Food Facts and add only verified missing data into RafSkoru's own fallback dataset.

## Decision

Product facts source order:

1. Open Food Facts
2. RafSkoru verified product facts database
3. Human verification queue
4. Missing data response

Excel may be used only as a human verification/import tool.

Excel must not be used as the runtime product facts source.

Runtime product facts should eventually live in JSON, SQLite, or Postgres.

## Missing or incomplete OFF rule

A product should be sent to the RafSkoru verification queue when one of the following is true:

- product is not found in Open Food Facts
- product has no ingredients list
- product has no allergen information and ingredients are also insufficient
- product has no usable nutrition facts for Nutri-Score style calculations
- product image/name exists but scoring-critical fields are missing
- OFF data looks inconsistent or too weak for scoring

## Scoring rule

If ingredients are missing, RafSkoru must not calculate content or ingredient-based health score.

If nutrition values are missing, RafSkoru must not calculate Nutri-Score unless enough required nutrition data exists.

If NOVA is missing but ingredients exist, RafSkoru may provide an estimated processing warning with low confidence.

If ingredients are missing, RafSkoru must not estimate NOVA.

Missing data should lower confidence and should be shown clearly to the user.

## Verified fallback dataset

The verified fallback dataset should contain only manually checked or trusted-source product facts.

Minimum useful fields:

- barcode
- productName
- brand
- quantity
- imageUrl or local image reference
- ingredientsText
- allergens
- additives
- nutritionPer100g
- nutriScoreGrade, if verified or calculable
- novaGroup, if verified or confidently inferred
- dataSource
- verifiedBy
- verifiedAt
- sourceUrl
- notes

## Human verification queue

When a product is missing or incomplete, backend should later create or return a queue item with:

- barcode
- query text
- product name if known
- OFF lookup status
- missing fields
- suggested priority
- createdAt

High-priority queue items:

- frequently scanned products
- barcode scans with product image/name but missing ingredients
- closed beta products scanned by multiple users
- products needed for demo/beta scenarios

## User-facing behavior

If product facts are incomplete:

- show product name/image if available
- show price data if available
- do not show unsupported health/content score
- show “veri eksik” explanation
- invite user to retry later or submit product label/photo in future versions

## Privacy rule

User allergen and health preferences remain local on device.

The missing product queue must not store user health profile.

Anonymous aggregate product-missing events are allowed.

## Consequences

This keeps RafSkoru honest and defensible.

It avoids fake scoring when ingredient data is missing.

It allows RafSkoru to build a focused Turkish packaged-food fallback dataset over time without paying for unnecessary one-time data if public/verified information is enough.

