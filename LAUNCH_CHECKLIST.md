# ReviewPilot AI Launch Checklist

This checklist is the last pass before charging real customers.

## 1. Environment Setup

Copy [.env.example](/C:/Users/Project/reviewpilot-ai/.env.example) into `.env.local` and confirm every required value exists:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `REVIEWPILOT_ALERT_FROM_EMAIL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_SCALE`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`

## 2. Stripe Production Setup

- Create three recurring prices in Stripe for Starter, Growth, and Scale.
- Paste those live price IDs into `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_SCALE`.
- Add a webhook endpoint in Stripe pointing to `/api/stripe/webhook`.
- Subscribe the webhook to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Confirm Stripe Billing Portal is enabled in the Stripe dashboard.

## 3. Twilio + Messaging Setup

- Confirm each restaurant record has the correct `twilioNumber`.
- Test inbound Twilio webhook routing for rating replies and `STOP`.
- Verify Twilio production messaging compliance text is acceptable for your market.
- Confirm Google review links are saved per restaurant before live outreach.

## 4. Owner Alerting Setup

- Confirm `RESEND_API_KEY` is set.
- Confirm `REVIEWPILOT_ALERT_FROM_EMAIL` uses a verified sending domain.
- Test a negative rating and confirm the owner receives the alert email.

## 5. Product Readiness Checks

- Kiosk branding uploads work from dashboard settings.
- Kiosk QR code generates, opens the right slug, and downloads as PNG and SVG.
- Customer loyalty points increase correctly at `1 USD = 10 points`.
- Review approval flow works from dashboard reviews and SMS center.
- Billing page reflects trial, active, past-due, and canceled states correctly.

## 6. End-to-End Test Matrix

Run every test below once in test mode before launch and once in production with a real internal restaurant account.

| Area | Test | Expected result |
| --- | --- | --- |
| Auth | New owner signs up | Owner lands on `/setup` |
| Onboarding | Owner opens settings from setup | Settings page loads with restaurant data |
| Billing | Owner starts Starter plan checkout | Stripe checkout opens |
| Billing | Successful Stripe checkout | Owner returns to `/dashboard/billing?checkout=success` |
| Billing | Webhook sync after checkout | Billing page shows active or trialing subscription |
| Billing | Owner opens billing portal | Stripe portal opens and returns correctly |
| Billing | Owner upgrades plan | Tier and SMS limit update correctly after webhook sync |
| Billing | Owner schedules cancellation | Billing page shows cancel-at-period-end state |
| Kiosk | QR code opens kiosk URL | Correct restaurant kiosk page loads |
| Kiosk | New customer signs in | Customer record is created and welcome SMS is scheduled |
| Kiosk | Returning customer with bill amount | Visit count increases, receipt is added, points increase |
| Reviews | Customer replies `5` | Review request is generated using AI settings |
| Reviews | `autoApprove` off + 5-star reply | Review request lands in pending approval |
| Reviews | `autoApprove` on + 5-star reply | Review request sends immediately |
| Recovery | Customer replies `1` to `3` | Apology message is drafted and stored as pending approval |
| Recovery | Negative reply owner alert | Owner email alert is sent |
| SMS | AI-generated deal message | Tone and length match settings |
| Compliance | Customer replies `STOP` | Customer is opted out and no future sends should occur |
| Customers | Receipt added for returning guest | Drawer shows updated spend, visits, and point history |
| Admin | Restaurant tier changed in admin | SMS limits update correctly |

## 7. Manual Production Smoke Test

Use one internal restaurant account and one real phone number.

1. Sign up as the owner.
2. Complete setup basics.
3. Start a billing trial.
4. Open the kiosk with QR.
5. Check in once as a new customer.
6. Reply with `5`.
7. Approve or confirm review routing.
8. Check in again as the same customer with a bill amount.
9. Reply with `2`.
10. Confirm owner alert email arrives.
11. Approve the recovery message.
12. Reply `STOP`.
13. Attempt another campaign send and confirm opt-out is respected.

## 8. Launch Blockers

Do not charge live customers until all of these are true:

- Stripe webhook sync works end-to-end.
- Twilio inbound and outbound messaging work on real numbers.
- Resend owner alerts work on your production sending domain.
- One full happy-path and one full unhappy-path test pass.
- One real cancellation or plan-switch test passes.
- One real `STOP` compliance test passes.

## 9. Nice Final Checks

- Add your public domain to `NEXT_PUBLIC_APP_URL` and `APP_URL`.
- Confirm legal pages are linked in the landing page footer.
- Check landing, dashboard, settings, kiosk, and billing on mobile widths.
- Keep screenshots or recordings of your final internal test run for future support debugging.
