# Contributing

## Setup

1. Create `.env.local` from [.env.example](/C:/Users/Project/reviewpilot-ai/.env.example).
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.
4. If Convex functions change, run `npx convex codegen` and `npm run convex:push` when appropriate.

## Before opening a PR

Run:

```bash
npm run lint
npm run build
```

If Convex functions changed, also run:

```bash
npx convex codegen
```

## Working principles

- Keep billing, kiosk, and SMS flows stable.
- Prefer small, reviewable changes.
- Update docs when env vars, pricing, onboarding, or operational behavior changes.
- Call out any schema changes clearly in your PR notes.
