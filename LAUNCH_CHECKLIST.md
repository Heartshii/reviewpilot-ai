# ReviewPilot AI Launch Checklist

This is the tracked go-live gate for charging real customers.

## Status Legend

- `NOT_STARTED`: not verified yet
- `IN_PROGRESS`: being tested or configured
- `BLOCKED`: cannot complete yet because another dependency is missing
- `DONE`: verified with evidence

## Launch Summary

| Area | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| Environment setup | `NOT_STARTED` |  |  |  |
| Stripe production setup | `NOT_STARTED` |  |  |  |
| Twilio + messaging setup | `NOT_STARTED` |  |  |  |
| Owner alerting setup | `NOT_STARTED` |  |  |  |
| Backup and recovery readiness | `NOT_STARTED` |  |  |  |
| Product readiness checks | `NOT_STARTED` |  |  |  |
| End-to-end test matrix | `NOT_STARTED` |  |  |  |
| Manual production smoke test | `NOT_STARTED` |  |  |  |
| Launch blockers cleared | `NOT_STARTED` |  |  |  |

## Final Launch Gate

ReviewPilot is **not launch-approved** until every P0 row below is `DONE`.

| P0 gate | Status | Notes |
| --- | --- | --- |
| Stripe webhook sync works end-to-end | `NOT_STARTED` |  |
| Twilio inbound and outbound messaging work on real numbers | `NOT_STARTED` |  |
| Resend owner alerts work on verified production domain | `NOT_STARTED` |  |
| One full happy-path customer flow passes | `NOT_STARTED` |  |
| One full unhappy-path customer flow passes | `NOT_STARTED` |  |
| One real cancellation or plan-switch test passes | `NOT_STARTED` |  |
| One real `STOP` compliance test passes | `NOT_STARTED` |  |

If any P0 row is not `DONE`, do **not** charge live customers.

## 1. Environment Setup

Copy [.env.example](/C:/Users/Project/reviewpilot-ai/.env.example) into `.env.local` and confirm every required value exists.

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set | `NOT_STARTED` |  |  |  |
| `CLERK_SECRET_KEY` is set | `NOT_STARTED` |  |  |  |
| `CLERK_WEBHOOK_SIGNING_SECRET` is set | `NOT_STARTED` |  |  |  |
| `NEXT_PUBLIC_CONVEX_URL` is set | `NOT_STARTED` |  |  |  |
| `CONVEX_DEPLOYMENT` is set | `NOT_STARTED` |  |  |  |
| `TWILIO_ACCOUNT_SID` is set | `NOT_STARTED` |  |  |  |
| `TWILIO_AUTH_TOKEN` is set | `NOT_STARTED` |  |  |  |
| `OPENAI_API_KEY` is set | `NOT_STARTED` |  |  |  |
| `RESEND_API_KEY` is set | `NOT_STARTED` |  |  |  |
| `REVIEWPILOT_ALERT_FROM_EMAIL` is set | `NOT_STARTED` |  |  |  |
| `STRIPE_SECRET_KEY` is set | `NOT_STARTED` |  |  |  |
| `STRIPE_WEBHOOK_SECRET` is set | `NOT_STARTED` |  |  |  |
| `STRIPE_PRICE_STARTER` is set | `NOT_STARTED` |  |  |  |
| `STRIPE_PRICE_GROWTH` is set | `NOT_STARTED` |  |  |  |
| `STRIPE_PRICE_SCALE` is set | `NOT_STARTED` |  |  |  |
| `NEXT_PUBLIC_APP_URL` is set | `NOT_STARTED` |  |  |  |
| `APP_URL` is set | `NOT_STARTED` |  |  |  |

## 2. Stripe Production Setup

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| Live recurring Starter price exists and is copied into env | `NOT_STARTED` |  |  |  |
| Live recurring Growth price exists and is copied into env | `NOT_STARTED` |  |  |  |
| Live recurring Scale price exists and is copied into env | `NOT_STARTED` |  |  |  |
| Webhook endpoint points to `/api/stripe/webhook` | `NOT_STARTED` |  |  |  |
| Webhook subscribes to `checkout.session.completed` | `NOT_STARTED` |  |  |  |
| Webhook subscribes to `customer.subscription.created` | `NOT_STARTED` |  |  |  |
| Webhook subscribes to `customer.subscription.updated` | `NOT_STARTED` |  |  |  |
| Webhook subscribes to `customer.subscription.deleted` | `NOT_STARTED` |  |  |  |
| `STRIPE_WEBHOOK_SECRET` matches the live webhook endpoint | `NOT_STARTED` |  |  |  |
| Stripe Billing Portal is enabled | `NOT_STARTED` |  |  |  |
| Annual prices are configured if annual billing is offered | `NOT_STARTED` |  |  |  |
| Add-on prices are configured if SMS packs / Premium AI are offered | `NOT_STARTED` |  |  |  |

## 3. Twilio + Messaging Setup

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| Each live workspace has the correct `twilioNumber` | `NOT_STARTED` |  |  |  |
| Inbound Twilio webhook routes rating replies correctly | `NOT_STARTED` |  |  |  |
| Inbound `STOP` requests opt the customer out correctly | `NOT_STARTED` |  |  |  |
| Outbound SMS sends from the correct scoped number | `NOT_STARTED` |  |  |  |
| WhatsApp path is verified if the workspace uses WhatsApp | `NOT_STARTED` |  |  |  |
| Google review links are set per workspace or location | `NOT_STARTED` |  |  |  |
| Messaging compliance copy is acceptable for the target market | `NOT_STARTED` |  |  |  |

## 4. Owner Alerting Setup

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` works in the live environment | `NOT_STARTED` |  |  |  |
| `REVIEWPILOT_ALERT_FROM_EMAIL` uses a verified domain | `NOT_STARTED` |  |  |  |
| Negative rating sends an owner alert email | `NOT_STARTED` |  |  |  |
| Alert email contains customer context and dashboard link | `NOT_STARTED` |  |  |  |

## 5. Backup and Recovery Readiness

Use [BACKUP_AND_RECOVERY.md](C:/Users/Project/reviewpilot-ai/BACKUP_AND_RECOVERY.md) as the operational source of truth.

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| One recent Convex production export exists | `NOT_STARTED` |  |  |  |
| One backup artifact has been opened and verified manually | `NOT_STARTED` |  |  |  |
| Stripe, Twilio, Clerk, and Resend production IDs are documented securely | `NOT_STARTED` |  |  |  |
| Recovery owners know where the runbook lives | `NOT_STARTED` |  |  |  |
| One restore drill is scheduled or completed | `NOT_STARTED` |  |  |  |

## 6. Product Readiness Checks

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| Kiosk branding uploads work from dashboard settings | `NOT_STARTED` |  |  |  |
| Kiosk QR code opens the correct slug | `NOT_STARTED` |  |  |  |
| Kiosk QR downloads as PNG and SVG | `NOT_STARTED` |  |  |  |
| Loyalty points increase correctly at `1 USD = 10 points` | `NOT_STARTED` |  |  |  |
| Review approval flow works from Reviews and SMS Center | `NOT_STARTED` |  |  |  |
| Billing page reflects trial, active, past-due, and canceled states | `NOT_STARTED` |  |  |  |
| Privacy export and delete tools work for one customer | `NOT_STARTED` |  |  |  |
| Leaderboard / badge preview works if enabled | `NOT_STARTED` |  |  |  |

## 7. End-to-End Test Matrix

Run every test below once in test mode before launch and once in production with one internal account.

| Area | Test | Expected result | Status | Evidence | Verified at |
| --- | --- | --- | --- | --- | --- |
| Auth | New owner signs up | Owner lands on `/setup` | `NOT_STARTED` |  |  |
| Onboarding | Owner opens settings from setup | Settings page loads with workspace data | `NOT_STARTED` |  |  |
| Billing | Owner starts Starter plan checkout | Stripe checkout opens | `NOT_STARTED` |  |  |
| Billing | Successful Stripe checkout | Owner returns to `/dashboard/billing?checkout=success` | `NOT_STARTED` |  |  |
| Billing | Webhook sync after checkout | Billing page shows active or trialing subscription | `NOT_STARTED` |  |  |
| Billing | Owner opens billing portal | Stripe portal opens and returns correctly | `NOT_STARTED` |  |  |
| Billing | Owner upgrades plan | Tier and SMS limit update correctly | `NOT_STARTED` |  |  |
| Billing | Owner schedules cancellation | Billing page shows cancel-at-period-end | `NOT_STARTED` |  |  |
| Kiosk | QR code opens kiosk URL | Correct kiosk page loads | `NOT_STARTED` |  |  |
| Kiosk | New customer signs in | Customer record is created and welcome message is scheduled | `NOT_STARTED` |  |  |
| Kiosk | Returning customer with bill amount | Visit count, receipt, and points all increase | `NOT_STARTED` |  |  |
| Reviews | Customer replies `5` | Review request is generated using AI settings | `NOT_STARTED` |  |  |
| Reviews | `autoApprove` off + 5-star reply | Review request lands in pending approval | `NOT_STARTED` |  |  |
| Reviews | `autoApprove` on + 5-star reply | Review request sends immediately | `NOT_STARTED` |  |  |
| Recovery | Customer replies `1` to `3` | Recovery draft is stored as pending approval | `NOT_STARTED` |  |  |
| Recovery | Negative reply owner alert | Owner email arrives | `NOT_STARTED` |  |  |
| SMS | AI-generated deal message | Tone and length match settings | `NOT_STARTED` |  |  |
| Compliance | Customer replies `STOP` | Customer is opted out and future sends stop | `NOT_STARTED` |  |  |
| Customers | Receipt added for returning customer | Drawer shows updated spend, visits, and points | `NOT_STARTED` |  |  |
| Admin | Workspace tier changed in admin | SMS limits update correctly | `NOT_STARTED` |  |  |

## 8. Manual Production Smoke Test

Use one internal business account and one real phone number.

| Step | Action | Expected result | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Sign up as owner | Setup loads | `NOT_STARTED` |  |
| 2 | Complete setup basics | Workspace is created | `NOT_STARTED` |  |
| 3 | Start billing trial | Billing reflects trial state | `NOT_STARTED` |  |
| 4 | Open kiosk via QR | Kiosk loads correctly | `NOT_STARTED` |  |
| 5 | Check in once as new customer | Customer and welcome flow are created | `NOT_STARTED` |  |
| 6 | Reply with `5` | Review routing happens | `NOT_STARTED` |  |
| 7 | Approve or confirm review routing | Message is sent correctly | `NOT_STARTED` |  |
| 8 | Check in again with bill amount | Receipt and points increase | `NOT_STARTED` |  |
| 9 | Reply with `2` | Recovery flow begins | `NOT_STARTED` |  |
| 10 | Confirm owner alert email arrives | Owner sees alert | `NOT_STARTED` |  |
| 11 | Approve recovery message | Recovery send completes | `NOT_STARTED` |  |
| 12 | Reply `STOP` | Opt-out is respected | `NOT_STARTED` |  |
| 13 | Attempt another campaign send | Opt-out remains enforced | `NOT_STARTED` |  |

## 9. Launch Blockers

Do not charge live customers until all of these are `DONE`.

| Blocker | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| Stripe webhook sync works end-to-end | `NOT_STARTED` |  |  |  |
| Twilio inbound and outbound work on real numbers | `NOT_STARTED` |  |  |  |
| Resend owner alerts work on production sending domain | `NOT_STARTED` |  |  |  |
| One full happy-path test passes | `NOT_STARTED` |  |  |  |
| One full unhappy-path test passes | `NOT_STARTED` |  |  |  |
| One cancellation or plan-switch test passes | `NOT_STARTED` |  |  |  |
| One real `STOP` compliance test passes | `NOT_STARTED` |  |  |  |

## 10. Nice Final Checks

| Check | Status | Owner | Evidence | Verified at |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` and `APP_URL` use the public domain | `NOT_STARTED` |  |  |  |
| Legal pages are linked in the landing footer | `NOT_STARTED` |  |  |  |
| Landing, dashboard, settings, kiosk, and billing were checked on mobile | `NOT_STARTED` |  |  |  |
| Screenshots or recordings of the final internal test run are saved | `NOT_STARTED` |  |  |  |
| Latest backup export path is recorded in the ops log | `NOT_STARTED` |  |  |  |
| Recovery runbook owner reviewed [BACKUP_AND_RECOVERY.md](C:/Users/Project/reviewpilot-ai/BACKUP_AND_RECOVERY.md) | `NOT_STARTED` |  |  |  |

## 11. Final Sign-Off

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Product owner |  | `PENDING` |  |  |
| Technical owner |  | `PENDING` |  |  |
| Launch decision |  | `NOT_APPROVED` |  |  |

Launch is approved only when:

- every P0 gate is `DONE`
- launch blockers are all `DONE`
- product owner signs off
- technical owner signs off
