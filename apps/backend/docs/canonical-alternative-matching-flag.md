# Canonical Alternative Matching Flag

## Flag

`USE_CANONICAL_ALTERNATIVE_MATCHING`

## Default behavior

When this environment variable is unset, backend uses the legacy alternative matcher.

The code default must remain legacy until the migration is fully completed and validated.

## Beta/local enablement

Set the flag to `1` only in local or beta environments after these checks pass:

- `npm.cmd run smoke`
- `USE_CANONICAL_ALTERNATIVE_MATCHING=1 npm.cmd run smoke:alternatives`
- `npm.cmd run manual:alternatives:canonical`

## What it changes

When enabled, alternative recommendations are matched by canonical product group metadata:

- `resolvedProductGroupKey`
- structured `packageSize`
- `alternativesEligible`

Legacy request shape is still accepted during migration. Mobile may still send legacy `productGroupKey` values such as `milk_1l`.

## Rollback

Unset `USE_CANONICAL_ALTERNATIVE_MATCHING` and restart/redeploy the backend.

No database or seed rollback is required while seed migration has not been completed.

## Seed data migration guardrails

Seed candidate `productGroupKey` values currently remain in the legacy composite form, such as `milk_1l` and `chips_100g`.

Structured `packageSize` is now present on seed candidates, but this is not a seed product group migration. The legacy `productGroupKey` values must not be replaced with canonical group keys until the matcher strategy and test contract are explicitly changed.

Current safe state:

- `productGroupKey` remains legacy composite.
- `packageSizeText` remains available for readability and parsing parity.
- `packageSize` stores the normalized structured package size.
- Legacy matcher remains the frozen baseline/control path.
- Canonical matcher remains behind `USE_CANONICAL_ALTERNATIVE_MATCHING`.
- Seed `packageSize` shape is validated by `packageSize.smoke.ts`.

Do not migrate seed `productGroupKey` values to canonical keys such as `milk`, `chips`, or `sparkling_water` until all of these are true:

1. Canonical matching is intentionally promoted to the active/default strategy.
2. Legacy-vs-canonical parity tests are replaced or reframed as request-shape convergence tests.
3. Normalizer tests explicitly cover both legacy composite input and canonical input with structured `packageSize`.
4. Unknown or incomplete package size continues to fail closed.
5. Real-device alternatives are retested with canonical matching enabled.

Rationale:

Changing seed `productGroupKey` from legacy composite keys to canonical group keys is not only a data migration. It changes the runtime matcher contract. If done while legacy matcher remains the baseline, legacy equality matching can return no candidates, and parity tests may lose their meaning.
