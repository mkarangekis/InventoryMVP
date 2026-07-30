# Business Model and Value Drivers

## Packaging and billing

- Public Single Bar price: USD 500/month.
- Public Enterprise price: custom.
- Public promise: 14-day trial, no credit card required.
- Billing provider: Stripe.
- Entitlement statuses: active, trialing, inactive, past_due, canceled,
  unknown.
- Entitlement source: Supabase Auth user metadata; demo receives mock trial.
- Subscription gating defaults off unless configured.

Evidence: landing, login, billing routes, entitlement module, flags.
Confidence: confirmed for source; production product/price/account unknown.
Impact if wrong: critical. Validation: owner-approved Stripe and published-site
review.

## Revenue events

- Checkout session creation
- Subscription created/updated/deleted
- Invoice payment succeeded/failed
- Portal-driven plan/cancellation changes

No authoritative MRR/ARR store or reconciliation exists in repository code.
Operations Center financial views must remain unavailable/unknown until a
read-only authoritative billing connector is configured.

## Value mechanism

```text
POS data + recipes + counts
  -> expected usage
  -> variance and cost signal
  -> forecast and reorder recommendation
  -> reduced leakage/stockouts + improved menu margin
  -> owner operating leverage
```

Primary cost drivers inferred from code: Vercel/server execution, Supabase
storage/database, QStash/Redis, model tokens, email, POS infrastructure, and
support/operator time. No actual costs are committed.

## Sales and onboarding motion

- Self-service trial and onboarding
- Email-based demo/contact sales
- Custom Enterprise sale
- Manual/operator pilot playbook

## Claims risk

The landing page includes numerical claims such as forecast accuracy, variance
identified, fewer stockouts, margin lift, recipe count, setup time, and time to
first report. No source, consent, reviewer, date, or claims registry exists in
the repository. These claims cannot be imported as Operations Center facts or
republished without owner evidence/review.
