# ReviewPilot AI

ReviewPilot AI is a reputation and retention platform for local service businesses built with Next.js, Convex, Clerk, and Tailwind CSS.

It helps operators:

- capture customer check-ins through kiosk and SMS flows
- route happy customers to Google reviews
- keep low ratings private for recovery
- approve AI-drafted apology messages
- track customer history, loyalty points, visits, and spend

## Stack

- Next.js 16
- React 19
- Convex
- Clerk
- Tailwind CSS v4
- Twilio

## Local development

```bash
npm install
npm run dev
```

For a one-time Convex sync:

```bash
npm run convex:push
```

For the migration ledger:

```bash
npm run migrations:list
npm run migrations:check
```

## Required environment variables

ReviewPilot uses a few external services. Make sure your `.env.local` includes the values your environment needs:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=

NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
GOOGLE_PLACES_API_KEY=

OPENAI_API_KEY=
VOICE_AI_HIGH_VALUE_SPEND=150

RESEND_API_KEY=
REVIEWPILOT_ALERT_FROM_EMAIL=alerts@yourdomain.com

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_STARTER_ANNUAL=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_GROWTH_ANNUAL=
STRIPE_PRICE_SCALE=
STRIPE_PRICE_SCALE_ANNUAL=
STRIPE_PRICE_SMS_PACK_500=
STRIPE_PRICE_SMS_PACK_1500=
STRIPE_PRICE_PREMIUM_AI=
STRIPE_REFERRAL_COUPON=
STRIPE_REFERRAL_CREDIT_CENTS=2000
OPENAI_STANDARD_MODEL=gpt-4o-mini
OPENAI_PREMIUM_MODEL=gpt-4o

SUPER_ADMIN_EMAILS=admin@example.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
E2E_KIOSK_SLUG=
```

A copyable template also lives in [.env.example](/C:/Users/Project/reviewpilot-ai/.env.example).

## Current product areas

- Landing page with SaaS positioning and trust pages
- Dashboard overview, reviews, customers, settings, and SMS center
- Competitor watch with Google Places search and weekly refresh snapshots
- Usage-based billing with SMS credit packs and a Premium AI add-on
- Monthly and annual Stripe billing for all three plans
- Referral program with shareable invite links and Stripe-backed billing rewards
- Agency client portfolio management for Scale workspaces
- Kiosk flow for guest capture
- Loyalty points based on spend history
- Admin panel for client setup

## Important notes

- New signups are redirected to `/setup` for onboarding.
- Negative ratings create pending apology approvals and can trigger owner email alerts when Resend is configured.
- Higher-value unhappy customers can be escalated into AI-generated Twilio voice recovery calls from `/dashboard/reviews`.
- STOP opt-out handling is implemented through the Twilio incoming webhook route.
- Competitor watch uses Google Places and needs `GOOGLE_PLACES_API_KEY` to power search and weekly sync.
- Usage add-ons need the extra Stripe price IDs in `.env.local` if you want one-time SMS packs and the Premium AI add-on to check out correctly.
- Annual plan checkout needs `STRIPE_PRICE_STARTER_ANNUAL`, `STRIPE_PRICE_GROWTH_ANNUAL`, and `STRIPE_PRICE_SCALE_ANNUAL`.
- The referral program uses `STRIPE_REFERRAL_COUPON` for the referred workspace discount and `STRIPE_REFERRAL_CREDIT_CENTS` for the referrer invoice credit amount.
- Agency workspaces can create and track managed client accounts from `/dashboard/agency`.
- White-label kiosk settings also flow into the public testimonial widget embed when white-label mode is enabled.

## Useful scripts

```bash
npm run dev
npm run build
npm run storybook
npm run build-storybook
npm run lint
npm run convex:push
npm run test:e2e
npm run test:e2e:ui
```

Before the first Playwright run, install the browser binary:

```bash
npx playwright install chromium
```

The deeper authenticated smoke tests use a localhost-only E2E session harness through `/api/e2e/bootstrap` and `/api/e2e/clear`. Those routes are only available outside production on `localhost` / `127.0.0.1`, so they are safe for local regression coverage without weakening live auth.

## Storybook

ReviewPilot now includes Storybook for documenting reusable marketing and settings surfaces.

- config lives in [.storybook/main.ts](/C:/Users/Project/reviewpilot-ai/.storybook/main.ts) and [.storybook/preview.tsx](/C:/Users/Project/reviewpilot-ai/.storybook/preview.tsx)
- stories currently cover the surface system plus reusable components in [stories/Foundations.stories.tsx](/C:/Users/Project/reviewpilot-ai/stories/Foundations.stories.tsx) and the component stories under [components](/C:/Users/Project/reviewpilot-ai/components)
- run `npm run storybook` for local component development
- run `npm run build-storybook` to generate a static documentation build

## Convex migrations

ReviewPilot now keeps an append-only migration ledger in [convex/migrations/README.md](/C:/Users/Project/reviewpilot-ai/convex/migrations/README.md) and [convex/migrations/manifest.json](/C:/Users/Project/reviewpilot-ai/convex/migrations/manifest.json). Use it to record schema/data rollouts and verify ordering before production deploys.

## Backup and recovery

The production backup and restore runbook lives in [BACKUP_AND_RECOVERY.md](/C:/Users/Project/reviewpilot-ai/BACKUP_AND_RECOVERY.md). It documents:

- what must be backed up
- backup cadence and artifact naming
- restore order across Convex, Stripe, Twilio, Clerk, and Resend
- post-restore validation
- incident response expectations
- minimum evidence to retain after a backup verification or restore event

## Execution roadmap

The detailed 37-item SaaS implementation roadmap lives in [SAAS_EXECUTION_PLAN.md](/C:/Users/Project/reviewpilot-ai/SAAS_EXECUTION_PLAN.md).

## Launch checklist

Before charging real customers, run the production checklist and test matrix in [LAUNCH_CHECKLIST.md](/C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md).
