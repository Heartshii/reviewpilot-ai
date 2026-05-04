# ReviewPilot AI

ReviewPilot AI is a restaurant reputation and retention platform built with Next.js, Convex, Clerk, and Tailwind CSS.

It helps restaurants:

- capture guest check-ins through kiosk and SMS flows
- route happy guests to Google reviews
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

## Required environment variables

ReviewPilot uses a few external services. Make sure your `.env.local` includes the values your environment needs:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

OPENAI_API_KEY=

RESEND_API_KEY=
REVIEWPILOT_ALERT_FROM_EMAIL=alerts@yourdomain.com

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_SCALE=

SUPER_ADMIN_EMAILS=admin@example.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

A copyable template also lives in [.env.example](/C:/Users/Project/reviewpilot-ai/.env.example).

## Current product areas

- Landing page with SaaS positioning and trust pages
- Dashboard overview, reviews, customers, settings, and SMS center
- Kiosk flow for guest capture
- Loyalty points based on spend history
- Admin panel for client setup

## Important notes

- New signups are redirected to `/setup` for onboarding.
- Negative ratings create pending apology approvals and can trigger owner email alerts when Resend is configured.
- STOP opt-out handling is implemented through the Twilio incoming webhook route.

## Useful scripts

```bash
npm run dev
npm run build
npm run lint
npm run convex:push
```

## Launch checklist

Before charging real customers, run the production checklist and test matrix in [LAUNCH_CHECKLIST.md](/C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md).
