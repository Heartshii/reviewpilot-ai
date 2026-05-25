# ReviewPilot AI SaaS Execution Plan

Last updated: May 5, 2026

## Current truth check

### Verified true now

- `Starter` does not get automated birthday or re-engagement messaging.
- `Pro` and `Agency` do get lifecycle messaging entitlement.
- Birthday SMS is automated through Convex cron in [convex/crons.ts](/C:/Users/Project/reviewpilot-ai/convex/crons.ts).
- Re-engagement SMS is automated through Convex cron in [convex/crons.ts](/C:/Users/Project/reviewpilot-ai/convex/crons.ts) and send logic in [convex/sms.ts](/C:/Users/Project/reviewpilot-ai/convex/sms.ts).
- The feature gating for lifecycle messaging is enforced in [lib/billing-plans.ts](/C:/Users/Project/reviewpilot-ai/lib/billing-plans.ts), [convex/sms.ts](/C:/Users/Project/reviewpilot-ai/convex/sms.ts), and [app/dashboard/settings/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/settings/page.tsx).

### False promises or partial promises still present

- Multi-location is still not a true delivered feature.
- White-label kiosk is only partially true. Branding exists, but full multi-location kiosk ops and custom domain ownership do not.
- Dedicated account manager, email support, and priority support are service promises, not product features.
- No automated test suite or CI workflow exists yet.
- No observability stack exists yet.
- No public rate limiting exists on kiosk or inbound webhook surfaces.

## Delivery order

### Phase A: Launch hardening first

These should be done before taking live paid customers.

| ID | Item | Detailed spec | Likely file changes | Acceptance criteria |
|---|---|---|---|---|
| 1 | Finish launch checklist | Convert [LAUNCH_CHECKLIST.md](/C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md) into a tracked go-live checklist with owner signoff fields, status fields, and final launch gate. | [LAUNCH_CHECKLIST.md](/C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md), [README.md](/C:/Users/Project/reviewpilot-ai/README.md) | Every production dependency has an explicit checked state and launch is blocked until all P0 items are complete. |
| 2 | Automated tests | Add smoke coverage for signup, setup, billing, kiosk check-in, negative rating recovery, positive review routing, and STOP handling. Use Playwright for browser flows and focused test coverage for webhook handlers. | `tests/`, [package.json](/C:/Users/Project/reviewpilot-ai/package.json), new config files | `npm test` or equivalent runs at least one full happy-path and one recovery-path test flow. |
| 3 | Error tracking | Add Sentry for app pages, API routes, and key server/runtime failures. Capture Stripe, Twilio, Resend, and Convex errors with contextual tags. | [app/layout.tsx](/C:/Users/Project/reviewpilot-ai/app/layout.tsx), API routes, Convex action wrappers, env docs | Production exceptions are visible in Sentry with user, restaurant, route, and provider context. |
| 4 | Rate limiting | Protect public kiosk route and inbound SMS webhook from abuse. Add per-IP and per-phone throttles where possible. | [app/kiosk/[slug]/page.tsx](/C:/Users/Project/reviewpilot-ai/app/kiosk/[slug]/page.tsx), [convex/http.ts](/C:/Users/Project/reviewpilot-ai/convex/http.ts), new rate-limit helper | Burst traffic or repeated abuse is throttled and logged instead of processing unlimited requests. |
| 5 | Input validation | Normalize phone numbers to E.164, clamp bill amounts, validate URLs, enforce safe slug rules, and sanitize business profile inputs. | [app/setup/page.tsx](/C:/Users/Project/reviewpilot-ai/app/setup/page.tsx), [app/dashboard/settings/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/settings/page.tsx), Convex mutations | Invalid phone numbers, bad slugs, malformed URLs, and negative bill values are blocked with clear errors. |
| 6 | Clerk to Convex sync webhook | Add an authoritative Clerk webhook path so user creation and role sync do not depend only on page-load bootstrap. | new `app/api/clerk/webhook/route.ts`, [convex/users.ts](/C:/Users/Project/reviewpilot-ai/convex/users.ts), env docs | New Clerk users appear in Convex even if they never hit the dashboard immediately after signup. |
| 7 | Privacy requests | Add export/delete workflow for customer data requests, likely admin-only or owner-only with confirmation steps. | new dashboard/admin pages, [convex/queries.ts](/C:/Users/Project/reviewpilot-ai/convex/queries.ts), [convex/dashboardMutations.ts](/C:/Users/Project/reviewpilot-ai/convex/dashboardMutations.ts) | Owner can export or delete a single customer’s data from the workspace. |
| 8 | Backup and audit log | Introduce admin audit events for tier changes, client deletion, billing sync issues, and sensitive settings edits. Document Convex backup/export process. | [convex/schema.ts](/C:/Users/Project/reviewpilot-ai/convex/schema.ts), [convex/adminMutations.ts](/C:/Users/Project/reviewpilot-ai/convex/adminMutations.ts), docs | Sensitive admin and owner actions are recorded and export/restore strategy is documented. |

### Phase B: Product depth

| ID | Item | Detailed spec | Likely file changes | Acceptance criteria |
|---|---|---|---|---|
| 9 | Multi-location support | Introduce a `locations` table tied to a parent business. Add location-level branding, Google URL, Twilio number, staff, kiosk slug, and reporting filters. Keep current `restaurants` as account/workspace and migrate flows to use `locationId` where appropriate. | [convex/schema.ts](/C:/Users/Project/reviewpilot-ai/convex/schema.ts), [convex/queries.ts](/C:/Users/Project/reviewpilot-ai/convex/queries.ts), [convex/sms.ts](/C:/Users/Project/reviewpilot-ai/convex/sms.ts), [convex/smsMutations.ts](/C:/Users/Project/reviewpilot-ai/convex/smsMutations.ts), dashboard/admin pages, kiosk routes | One owner can create and manage up to 5 separate locations on Agency, each with distinct kiosk link, branding, SMS number, and filtered reporting. |
| 10 | Staff accounts and RBAC | Replace placeholder staff management with invite, accept, role assignment, and scoped dashboard access. Roles should at least include Owner, Manager, Staff, Super Admin. | [app/dashboard/settings/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/settings/page.tsx), [convex/users.ts](/C:/Users/Project/reviewpilot-ai/convex/users.ts), [proxy.ts](/C:/Users/Project/reviewpilot-ai/proxy.ts) | Owners can invite staff and staff permissions restrict sensitive actions like billing and client deletion. |
| 11 | WhatsApp channel | Abstract messaging channels so review prompts and recovery can send through Twilio SMS or WhatsApp. | [convex/schema.ts](/C:/Users/Project/reviewpilot-ai/convex/schema.ts), [convex/sms.ts](/C:/Users/Project/reviewpilot-ai/convex/sms.ts), settings UI | A business can select WhatsApp for supported markets and outbound logs record the chosen channel. |
| 12 | Email campaigns | Add owner-driven email campaigns to complement SMS where customers have email addresses and opt-in status. | customer schema, campaign UI, Resend integration | Owner can send a segment-based email campaign and see sent/failed history. |
| 13 | Scheduled campaigns | Add scheduled send time, recurrence rules, and saved campaign templates. | [app/dashboard/sms/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/sms/page.tsx), new Convex campaign tables, crons | Owner can schedule a future campaign and the system sends it automatically at the correct time. |
| 14 | Segmentation expansion | Expand segments beyond current set with top spenders, recent reviewers, frequent returners, dormant high-value customers, and location-specific segments. | [convex/queries.ts](/C:/Users/Project/reviewpilot-ai/convex/queries.ts), [convex/smsMutations.ts](/C:/Users/Project/reviewpilot-ai/convex/smsMutations.ts), SMS UI | Segment counts and send targets update dynamically from real customer behavior. |
| 15 | AI reply suggestions for public reviews | Provide suggested owner-facing public replies for positive and negative reviews. | reviews dashboard, AI prompt helpers, new mutations | Owner can generate and copy a suggested public response from the Reviews page. |
| 16 | Sentiment analysis | Move beyond star rating by tagging negative feedback into categories like service, wait time, quality, value, cleanliness. | [convex/schema.ts](/C:/Users/Project/reviewpilot-ai/convex/schema.ts), [convex/sms.ts](/C:/Users/Project/reviewpilot-ai/convex/sms.ts), dashboard insights | Each feedback record can store one or more structured issue tags and insights summarize them. |
| 17 | Competitor watch | Add periodic competitor review tracking for nearby businesses and show changes in rating and volume. | new admin/business tables, scheduled jobs, dashboard widgets | Owner can view competitor trend snapshots updated weekly. |
| 18 | NPS / CSAT analytics | Add charted experience scoring trends using current rating data and future prompt variants. | [app/dashboard/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/page.tsx), [convex/queries.ts](/C:/Users/Project/reviewpilot-ai/convex/queries.ts) | Dashboard shows trend charts and score movement for recent periods. |

### Phase C: Revenue and growth

| ID | Item | Detailed spec | Likely file changes | Acceptance criteria |
|---|---|---|---|---|
| 19 | Referral program | Add referral codes, referral status tracking, and billing rewards. | billing schema, setup UI, admin reporting | A customer can refer another business and both rewards are tracked. |
| 20 | Add-ons and usage billing | Support extra SMS pack purchases and premium AI add-ons on top of base subscriptions. | [app/dashboard/billing/page.tsx](/C:/Users/Project/reviewpilot-ai/app/dashboard/billing/page.tsx), Stripe routes, [convex/billing.ts](/C:/Users/Project/reviewpilot-ai/convex/billing.ts) | Owners can buy extra usage without changing the main plan. |
| 21 | Testimonial widget | Build an embeddable widget that displays top 5-star reviews on a client website. | new public widget route, review export query, embed script | Business can paste a script tag on another site and render approved testimonials. |
| 22 | Agency management mode | Let agencies manage many client accounts from one dashboard with brand-safe separation. | admin and client schema, auth scopes, new agency workspace UI | Agency owner can switch between managed accounts without using super-admin. |
| 23 | White-label offering | Expand branding into full white-label: custom logo, sender identity, optional custom domain, reduced ReviewPilot branding. | kiosk UI, email templates, app shell, domain docs | Agency clients can run customer-facing flows with their own brand identity end-to-end. |
| 24 | Annual billing | Add annual Stripe prices, savings copy, and plan switching support. | [lib/billing-plans.ts](/C:/Users/Project/reviewpilot-ai/lib/billing-plans.ts), Stripe routes, billing UI | Owner can choose monthly or annual billing and the dashboard shows the correct term. |
| 25 | Trial verification | Verify and document trial behavior across billing page, Stripe checkout, and subscription sync states. | [app/api/stripe/checkout/route.ts](/C:/Users/Project/reviewpilot-ai/app/api/stripe/checkout/route.ts), billing UI, docs | Trial start, no-trial mode, trial end state, and portal behavior are all tested and documented. |

### Phase D: Differentiators

| ID | Item | Detailed spec | Likely file changes | Acceptance criteria |
|---|---|---|---|---|
| 26 | Voice AI recovery | Add phone-call recovery for high-value negative experiences. | new provider integration layer, escalation rules, admin settings | Owner can enable voice recovery for selected high-risk cases. |
| 27 | POS integration | Pull receipts and visit data directly from systems like Square or Toast. | new integration routes, schema, setup UI | Visits and spend can be created automatically from a POS source. |
| 28 | Reservation integration | Trigger post-visit requests from reservation platforms like Resy/OpenTable. | integration layer, event ingest, customer matching | A completed reservation can automatically create a timed follow-up request. |
| 29 | Loyalty redemption | Turn points into rewards with redemption tracking and controls. | customer/reward schema, kiosk and dashboard UI | Customer can earn and redeem points with a clear audit trail. |
| 30 | Mobile owner app | Add lightweight mobile-first owner workflow for approvals and alerts. | new app or PWA layer, shared API logic | Owner can approve pending recovery messages from mobile quickly. |
| 31 | Public badges / leaderboard | Add marketing-grade trust badges or opt-in leaderboards for high-rated businesses. | marketing routes, public widgets, admin controls | A business can opt into a public badge or leaderboard display. |

### Phase E: Code quality and DX

| ID | Item | Detailed spec | Likely file changes | Acceptance criteria |
|---|---|---|---|---|
| 32 | CI/CD | Add GitHub Actions for install, lint, build, codegen, and tests. | new `.github/workflows/ci.yml` | Every push and PR runs automated checks. |
| 33 | Storybook | Document core marketing, dashboard, card, and chart components. | Storybook config, component stories | UI primitives can be previewed and tested in isolation. |
| 34 | Convex migration helpers | Add a migration folder and scripts for schema/data changes. | new `convex/migrations/`, docs | Data migrations are reproducible and documented. |
| 35 | Env validation | Add startup validation with Zod for Stripe, Clerk, Twilio, Resend, and OpenAI keys. | new env helper module, route imports | Build or server startup fails fast with clear missing-env errors. |
| 36 | Remove tsbuildinfo from repo | Move `tsconfig.tsbuildinfo` into `.gitignore` and remove it from tracking. | [.gitignore](/C:/Users/Project/reviewpilot-ai/.gitignore) | Build cache files are no longer committed. |
| 37 | Community / repo docs | Add `CONTRIBUTING.md`, `LICENSE`, and `CODE_OF_CONDUCT.md`. | new repo root docs | Repo has baseline contributor and licensing docs. |

## Recommended implementation slices

### Slice 1: hardening

- 1 launch checklist closure
- 2 automated smoke tests
- 3 Sentry
- 4 rate limiting
- 5 validation
- 6 Clerk webhook sync

### Slice 2: truth alignment

- 9 multi-location
- 10 RBAC
- 23 full white-label
- 24 annual billing
- 25 trial verification

### Slice 3: growth features

- 13 scheduled campaigns
- 14 segmentation expansion
- 15 public reply suggestions
- 16 sentiment tags
- 20 add-ons
- 21 testimonial widget

## Immediate recommendation

Do not market `multi-location` as fully available until item `9` is complete.

Do market these as real today:

- review routing
- recovery approvals
- AI recovery drafts
- birthday SMS
- re-engagement SMS
- loyalty points
- QR / kiosk
- billing
- owner alerts
- Agency AI insights
