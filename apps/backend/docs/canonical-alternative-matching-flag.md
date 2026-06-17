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
