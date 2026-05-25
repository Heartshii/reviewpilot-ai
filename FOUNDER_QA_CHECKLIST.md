# ReviewPilot Founder QA Checklist

Use this checklist before showing the product to a real client or turning on live billing.

## 1. Public flow

- Open `/` on desktop and mobile.
- Confirm `Start Free Trial` and `Sign In` are visible and route correctly.
- Open `/about`, `/contact`, `/privacy`, and `/terms`.
- Confirm the landing page has no broken spacing, cutoff text, or missing CTA states.

## 2. Signup and onboarding

- Create a brand new account.
- Confirm signup lands on `/setup`.
- Complete setup with:
  - business name
  - business type
  - subtype
  - phone
  - website
  - Google review link
- Confirm setup lands on `/dashboard/billing`.
- Confirm the new workspace appears in the dashboard and settings.

## 3. Dashboard basics

- Open:
  - `/dashboard`
  - `/dashboard/customers`
  - `/dashboard/reviews`
  - `/dashboard/loyalty`
  - `/dashboard/sms`
  - `/dashboard/integrations`
  - `/dashboard/leaderboard`
  - `/dashboard/settings`
  - `/dashboard/billing`
- Confirm there are no console errors or blank sections.
- Confirm the left nav groups make sense:
  - Workspace
  - Growth
  - Operations

## 4. Kiosk and customer capture

- Open the kiosk URL from settings or QR card.
- Test:
  - new customer check-in
  - phone entry
  - SMS consent
  - success screen
- Confirm the customer appears in:
  - Customers
  - Dashboard recent customer sections
  - Loyalty balances

## 5. Loyalty loop

- Create a reward.
- Add:
  - title
  - description
  - image URL
  - point cost
- Confirm the reward appears in the reward catalog.
- From Loyalty, send:
  - reward claim link
  - points balance reminder
- Confirm the customer-facing claim page works.
- Mark a reward as redeemed and confirm the status updates.

## 6. Reviews and recovery

- Create a low-rating flow.
- Confirm:
  - customer name appears
  - customer phone appears
  - pending recovery item appears
  - approval/dismiss actions work
- Create a positive flow.
- Confirm:
  - review routing still works
  - AI public reply suggestion can be generated
  - reply text can be copied and edited

## 7. Messaging and campaigns

- Open `/dashboard/sms`.
- Test:
  - SMS campaign draft
  - email campaign draft
  - WhatsApp draft if configured
  - schedule campaign
  - cancel scheduled campaign
- Confirm segmentation counts look reasonable.
- Confirm Starter/Pro/Agency gating still behaves correctly.

## 8. Settings and branding

- In Settings, check each section through the sub-nav:
  - Business profile
  - Kiosk branding
  - Kiosk QR
  - White-label
  - SMS settings
  - AI behavior
  - Locations
  - Team access
- Save each section and refresh the page.
- Confirm settings persist after refresh.

## 9. Billing and subscriptions

- Open `/dashboard/billing`.
- Confirm:
  - plan name
  - billing interval
  - SMS usage
  - add-ons
  - referral section
- Run one Stripe test subscription.
- Confirm:
  - checkout succeeds
  - billing page updates
  - subscription appears in Stripe
  - webhook events are received

## 10. Integrations

- Open `/dashboard/integrations`.
- Confirm each provider card can:
  - pick a location
  - save settings
  - show endpoint details
  - run test import
- If you have real provider access, test one webhook against:
  - Square or Toast
  - OpenTable or Resy

## 11. Admin

- Sign in with an admin allowlisted account.
- Open `/admin`.
- Confirm:
  - clients list
  - remove client action
  - tier controls
  - audit entries
- Verify you cannot accidentally remove the wrong client without the confirmation flow.

## 12. Mobile checks

- Test on a narrow viewport:
  - landing page
  - kiosk
  - owner page
  - billing
  - settings
- Confirm menus, buttons, and forms are usable without horizontal scroll.

## 13. External integrations that still need real-world verification

These cannot be fully trusted from localhost-only app checks:

- Stripe live checkout and live webhook behavior
- Twilio SMS delivery and inbound replies
- WhatsApp channel delivery
- Resend email delivery
- Google Business Profile connectivity if you add it later
- POS / reservation provider webhooks from real vendor dashboards

## 14. Automated checks already available

Run these before every big demo:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run test:e2e
```

## 15. Demo accounts to keep

Maintain at least these internal demo workspaces:

- restaurant
- dental clinic
- salon or spa
- general service business

That helps you verify business-specific wording across the app.
