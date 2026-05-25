# Convex Migrations

This folder is the migration ledger for ReviewPilot AI.

## What belongs here

- every schema or data-shape change that needs rollout tracking
- backfills that were applied manually or through Convex mutations/actions
- migration notes for production deploys

## Files

- `manifest.json`: ordered migration history with id, title, scope, and rollout status

## Workflow

1. Add a new migration entry to `manifest.json` before or with the schema/data change.
2. Use an ISO-like date prefix in the id, for example:
   - `2026-05-08-some-change`
3. Keep entries append-only.
4. Record whether the migration is:
   - `planned`
   - `applied`
   - `deprecated`
5. If a migration needs a one-time backfill, document:
   - what changed
   - where the backfill ran
   - how to verify it

## Commands

List the ledger:

```bash
npm run migrations:list
```

Validate the ledger shape and duplicate ids:

```bash
npm run migrations:check
```

## Notes

- This repo already uses targeted backfill helpers in live code paths, such as billing default normalization.
- Keep operational backfills idempotent whenever possible.
- If you add a future scripted backfill, store the script in this folder or document the exact Convex mutation/action used to run it.
