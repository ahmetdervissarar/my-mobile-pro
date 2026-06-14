# ADR-002: Normalized PriceOffer Contract

Date: 2026-06-14
Status: Accepted

## Context

RafSkoru's core value depends on live or near-live grocery price information. However, price data may come from multiple providers over time:

- manual beta data
- last-known cached data
- beta reference data
- approved retailer/API providers
- future commercial providers such as Tamara/Price2Spy or REM People, only if contract and usage rights are clear

Provider-specific response formats must not leak into the mobile UI or scoring logic.

## Decision

All price providers must be normalized into a common `PriceOffer` / `EnrichedMarketOffer` style contract before reaching the mobile app.

The mobile app should not know which provider produced the raw data format. It should only receive normalized price offers.

## Required normalized fields

Each normalized price offer should support the following concepts:

- `source`: price source identifier
- `marketName`: human-readable market name
- `chainCode`: normalized chain code when known
- `price`: numeric price
- `currency`: usually TRY
- `unitPrice`: optional unit price when available
- `unit`: optional package/unit information
- `productName`: provider product name
- `barcode`: GTIN/barcode when available
- `productUrl`: optional source product URL
- `imageUrl`: optional source product image URL
- `availability`: in stock / out of stock / unknown
- `observedAt`: when the price was observed or fetched
- `freshnessLabel`: live / recent / stale / reference
- `store`: optional store-level data
- `distanceMeters`: optional distance from user location
- `distanceText`: optional readable distance
- `confidence`: confidence score for matching and freshness
- `matchType`: barcode / exact name / fuzzy name / category reference
- `note`: optional explanation for the user or debug context

## Freshness rule

RafSkoru must show price freshness clearly.

Examples:

- live: fetched from an approved provider in the current request
- recent: fetched recently and still acceptable for closed beta
- stale: old cached price; must be shown with caution
- reference: beta/reference price, not a live market price

A price without `observedAt` should not be presented as live.

## Matching priority

Preferred matching order:

1. GTIN/barcode exact match
2. retailer/provider product ID match
3. exact normalized product name + package size
4. fuzzy product name + package size
5. category-level beta reference price

Category-level reference price must never be presented as the actual product price.

## Mobile UI rule

The mobile app should display:

- best offer
- nearby offers when location is available
- freshness label
- market name
- distance when available
- clear disclaimer for stale/reference prices

The mobile app must not display provider-specific raw fields.

## Privacy rule

Location can be used for distance calculations but should not be stored as a user profile.

User health, allergen, and chronic sensitivity preferences remain local on device and are not part of price provider calls.

## Current allowed active sources

Current active/non-removed source types:

- `manual_beta`
- `beta_reference`
- `last_known`
- `retailer_scraper`

Removed or inactive sources:

- `camgoz`
- `joj`
- `marketfiyati`

These removed sources must not be reintroduced without a new architecture decision.

## Consequences

This keeps RafSkoru provider-agnostic.

It allows us to test with manual/beta data now and later plug in approved commercial or retailer data sources without rewriting mobile UI or scoring logic.
