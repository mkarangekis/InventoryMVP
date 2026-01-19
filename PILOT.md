# Pilot Handoff (MVP)

## Purpose
This document is the operator playbook for running the MVP during a pilot.

## Daily Flow (10–15 min)
1) Check Dashboard for variance flags.
2) Review Draft POs and approve if needed.
3) If POS CSV is used, upload daily exports on `/ingest`.

## Weekly Flow (30–60 min)
1) Inventory Quick Count on `/inventory`.
2) Save snapshot (use the correct date).
3) Review variance trends on `/dashboard`.
4) Adjust drink specs on `/profit` if leakage or margin issues persist.

## Initial Setup (one-time)
1) Create tenant + location(s) on `/onboarding`.
2) Add ingredients + costs (seed script or CSV).
3) Add vendors + reorder policies.
4) Add drink specs for each menu item.

## Roles
- Owner/Manager: quick counts, ordering approvals.
- Analyst/Operator: POS uploads, review variance + profitability.

## Common Issues
- No variance flags: need 2 snapshots and usage jobs.
- No forecast: run forecast job or wait for cron.
- Draft POs empty: run ordering job or check reorder policies.

## Demo Credentials (local)
- Email: demo@bar.local
- Password: Password123!
