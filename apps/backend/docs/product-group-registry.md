# RafSkoru Product Group Registry Architecture

## Decision

Closed beta must feel close to the real commercial RafSkoru experience. Product recognition and RafSkoru scoring should cover broad packaged food groups, not only a few demo groups.

Broad recognition does not mean broad alternative recommendations.

RafSkoru separates two independent axes: coverage and alternative eligibility.

## Core rule

Recognize broadly. Recommend alternatives narrowly and safely.

If a product group is recognized but same-product alternatives are not safe, the product result and RafSkoru can still be shown, but the alternative card should fail closed.

## Taxonomy layers

department -> category -> coarseGroup -> productGroup -> variantAttributes

coarseGroup is useful for broad scoring context and peer explanations. productGroup is the narrow identity used for same-product alternatives.

Milk, kefir, and ayran may share a coarse group, but they must not leak into each other's same-product alternative card.

## Risk levels

standard: normal packaged food groups where alternatives may be enabled if group, package size, and required attributes are safe.
elevated: groups requiring stricter matching, such as lactose-free, gluten-free, sugar-free, or allergen-sensitive categories.
restricted: baby formula, baby foods, and medical/special diet products. In closed beta, automatic same-product alternatives stay disabled unless a curated and human-verified allowlist is introduced.

## Eligibility states

enabled: alternative card may be shown when product group, package size, and required match attributes are safe.
shadow: product group is recognized and can be tested internally, but the app should not show alternatives by default.
disabled: no same-product alternative card in beta.

## Same-product alternatives vs healthier swaps

Same-product alternatives and healthier swaps are separate pipelines.
Same-product alternative examples: milk -> milk, chips -> chips, pasta -> pasta.
Healthier swap examples: cola -> sparkling water, chips -> healthier snack.
Healthier swaps remain disabled in closed beta until a curated and separately tested model exists.

## Closed beta policy

Closed beta should include broad packaged food group coverage in the registry, even if some groups do not yet have trustworthy alternatives.
Safe behavior: recognized product -> show product result and RafSkoru; safe group with enough candidates -> show same-product alternatives; unknown, unsafe, restricted, or not comparable -> suppress alternatives.

## Migration from legacy keys

Current legacy composite keys such as milk_1l and chips_100g remain in seed data until canonical matching becomes the active strategy.
Migration path: expand with registry and structured attributes; migrate with shadow parity; contract by removing legacy composite reads only after canonical matching is default.
Seed product group migration must not happen before matcher strategy and test contracts are intentionally changed.
