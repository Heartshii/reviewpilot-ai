# ReviewPilot AI Backup and Recovery Runbook

This runbook defines how to back up, verify, and restore ReviewPilot AI production systems.

It is written for operational recovery, not for product onboarding. Use it when production data, provider configuration, or customer-facing delivery behavior has been lost, corrupted, or changed unexpectedly.

## Recovery Targets

- `RPO target`: 24 hours or better
- `RTO target`: same business day for partial restore
- `Worst-case full restore target`: next business day

## Systems In Scope

- Convex production data
- Clerk authentication configuration
- Stripe products, prices, subscriptions, coupons, and billing portal setup
- Twilio phone numbers, messaging webhooks, and voice callbacks
- Resend verified domain and sender configuration
- Vercel or hosting environment variables
- operational documentation and release references

## Critical Business Records

Highest-priority data groups in [convex/schema.ts](C:/Users/Project/reviewpilot-ai/convex/schema.ts):

- `restaurants`
- `locations`
- `users`
- `restaurantSettings`
- `customers`
- `receipts`
- `feedback`
- `smsLogs`
- `campaigns`
- `billingPurchases`
- `referrals`
- `loyaltyRewards`
- `loyaltyClaims`
- `voiceRecoveryCalls`
- `agencyClients`
- `adminAuditLogs`
- `integrationConnections`
- `integrationEvents`

If recovery time is limited, restore these in this priority order:

1. workspace identity and access
2. billing and provider mappings
3. customer and feedback history
4. scheduled messaging and loyalty state
5. analytics, watchlists, and secondary operational logs

## Ownership

| Area | Primary owner | Backup owner |
| --- | --- | --- |
| Convex data exports | Technical owner | Engineering backup |
| Hosting env vars | Technical owner | Product owner |
| Stripe billing config | Billing owner | Technical owner |
| Twilio messaging and voice config | Messaging owner | Technical owner |
| Clerk auth config | Technical owner | Engineering backup |
| Resend domain and sender config | Messaging owner | Support owner |
| Incident log and recovery evidence | Product owner | Technical owner |

## Backup Cadence

### Daily

- export Convex production data
- confirm the current production release tag or commit hash
- confirm the secret source of truth is current

### Weekly

- open one recent Convex backup artifact and inspect the metadata
- verify Stripe price IDs still match the documented plan and add-on catalog
- verify Twilio numbers, webhook URLs, and WhatsApp / voice capability
- verify Clerk webhook and sign-in configuration still match production

### Monthly

- run one restore drill in a non-production environment
- review `adminAuditLogs` for destructive or unusual actions
- confirm this runbook still matches the live system

## What Must Be Backed Up

### 1. Convex production data

Back up all production tables, with special attention to:

- workspace records
- billing state
- customer records
- feedback and recovery activity
- scheduled campaigns
- loyalty balances and claims
- audit logs

Each artifact should include:

- export date and time in UTC
- Convex deployment name
- environment name
- release tag or commit SHA
- operator name

Recommended filename pattern:

```text
reviewpilot-prod-convex-YYYY-MM-DDTHH-mm-ssZ-commit-or-tag.json
```

### 2. Environment configuration

Keep a secured copy of production values for:

- Clerk
- Convex
- Stripe
- Twilio
- Resend
- OpenAI
- Sentry
- Google Places

Do not store secrets in the git repository. Store them in a password manager or secure secrets vault.

### 3. Stripe business configuration

Record and periodically verify:

- product IDs
- monthly and annual price IDs
- add-on price IDs
- coupon IDs
- referral coupon ID
- webhook endpoint URL
- webhook signing secret storage location
- Billing Portal enabled state

### 4. Twilio business configuration

Record and periodically verify:

- each active phone number
- whether the number supports SMS
- whether the number supports voice
- whether the number supports WhatsApp
- inbound webhook URL
- status callback URL
- voice callback URL

### 5. Clerk and Resend configuration

Record and periodically verify:

- Clerk production instance and redirect URLs
- Clerk webhook endpoint URL
- Resend verified domain
- operational sender addresses
- owner alert sender address

## Backup Procedure

### Convex export

1. Open the correct production Convex deployment.
2. Export a full production snapshot using the approved Convex export workflow.
3. Name the artifact with the standard pattern.
4. Store it in the protected backup location.
5. Record the artifact path, deployment, and release version in the operations log.

### Provider config capture

Run this after any production change to billing or messaging:

1. Confirm the production change directly in Stripe, Twilio, Clerk, or Resend.
2. Update the internal ops record with the exact IDs or URLs that changed.
3. If the change affects launch readiness, update [LAUNCH_CHECKLIST.md](C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md).

### Backup verification

At least once per week:

1. Open one recent backup artifact.
2. Confirm it includes top-level workspace records.
3. Confirm the artifact date matches the expected schedule.
4. Confirm the recorded deployment name is correct.
5. Record that verification in the ops log.

## Restore Strategy

If production must be recovered, restore in this order:

1. hosting and environment variables
2. Clerk configuration
3. Convex deployment and schema compatibility
4. Convex data import or replay
5. Stripe webhooks, prices, and subscription mappings
6. Twilio inbound and outbound routing
7. Resend sender verification
8. application smoke tests

Do not reopen live traffic before steps 5 through 8 are checked.

## Partial Restore Procedures

### Restore one customer record

Use this when a customer was deleted or corrupted but the rest of the workspace is healthy.

1. Retrieve the most recent valid Convex backup.
2. Extract all rows related to that customer from:
   - `customers`
   - `receipts`
   - `feedback`
   - `smsLogs`
   - `loyaltyClaims`
   - `voiceRecoveryCalls`
3. Restore the data into a safe environment first.
4. Verify references, timestamps, and loyalty balances.
5. Reinsert into production only after validation.

### Restore one workspace

Use this when one client workspace is damaged but the platform is otherwise healthy.

1. Restore identity and access records first:
   - `restaurants`
   - `locations`
   - `users`
   - `restaurantSettings`
2. Restore activity records second:
   - `customers`
   - `receipts`
   - `feedback`
   - `smsLogs`
   - `campaigns`
   - `loyaltyRewards`
   - `loyaltyClaims`
3. Verify provider mappings:
   - `stripeCustomerId`
   - `stripeSubscriptionId`
   - `twilioNumber`
   - Google review URL
   - branding assets and kiosk slug

### Full production restore

Use this only when a broad production failure has occurred.

1. Freeze admin actions and disable risky manual mutations.
2. Export the current damaged state before changing anything.
3. Confirm the target restore point and artifact timestamp.
4. Restore env vars and provider configuration first.
5. Restore the Convex deployment and import the selected data artifact.
6. Recheck Stripe, Twilio, Clerk, and Resend mappings.
7. Run the smoke tests listed below.
8. Reopen traffic only after the technical owner signs off.

## Post-Restore Validation

After any restore, verify all of the following:

- owner can sign in
- dashboard loads
- billing page shows the expected tier and interval
- kiosk link opens
- customer list loads
- one positive review approval path works
- one negative recovery path works
- one outbound phone message works
- one inbound reply works
- one owner alert email works

Use [LAUNCH_CHECKLIST.md](C:/Users/Project/reviewpilot-ai/LAUNCH_CHECKLIST.md) as the verification surface when the restore affects production.

## Incident Playbook

If production data is lost, corrupted, or mapped to the wrong provider:

1. pause destructive admin actions
2. identify blast radius:
   - one customer
   - one workspace
   - one provider surface
   - all production
3. export the current damaged state before restoring
4. review `adminAuditLogs`
5. choose the restore point
6. restore in non-production first when possible
7. validate Stripe, Twilio, and Clerk mappings before reopening traffic
8. record root cause, restore point, and exact operator actions taken

## Audit Log Use

Review `adminAuditLogs` when investigating:

- client creation or removal
- billing or tier changes
- global settings changes
- customer privacy deletion
- suspicious operational edits

Use the log to answer:

- who performed the action
- when it happened
- which workspace was affected
- whether the incident was user-driven or system-driven

## Evidence To Retain

For each backup verification or recovery event, keep:

- backup artifact name
- deployment name
- operator name
- date and time
- related commit or release tag
- screenshots or copied IDs for Stripe and Twilio verification
- notes about anything manually corrected after restore

## Minimum Production Standard

Do not consider ReviewPilot production-ready unless:

- at least one recent Convex export exists
- at least one backup artifact has been manually verified
- provider configuration has been documented
- this runbook is accessible to the operational owners
- one restore drill has been scheduled or completed
