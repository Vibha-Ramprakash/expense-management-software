# Demo data and reset

The default organization is Northstar Studio using EUR, a weekly Friday reimbursement run, and approvers Maya Chen and Julian Hart.

The seed set intentionally covers every meaningful state:

- Alpine Rail — submitted travel claim
- Field Notes Café — submitted meal above the configured limit
- Figma — approved software claim
- Hotel Helvetia — scheduled travel reimbursement
- Print Atelier — paid client-cost claim
- Digitec — draft equipment claim
- Lumen House Hotel — submitted EUR 86.40 travel claim, matched by the default Command desk example
- City Transfer — submitted EUR 42.80 travel claim, also matched by “below €100”

The employee demo identity is Noah Williams. The approver view uses Maya Chen and finance uses Julian Hart. This separation proves the self-approval rule.

`npm run reset` removes only project-local Wrangler state. On the next start or API access, the app recreates the schema and seed set. `POST /api/reset` restores records while the demo is running. Hosted production data must never be reset through this local command.

Seed records include receipt filenames for visual realism but not uploaded bytes. Newly uploaded receipts are stored and can be opened from the expense detail. `docs/demo-fixtures/lumen-house-hotel-eur-86-40.png` is the synthetic OCR fixture for the Lumen House example; live acceptance extracts merchant, 2026-08-31, EUR 86.40 and Travel.

The detail view and assistant explicitly report those seed attachments as missing. The Digitec draft can be completed by attaching a real/synthetic test receipt. Custom category names are mapped to valid configured categories on reset, and seed policy flags are recomputed against the active limits. Concurrent first-load requests seed the same IDs idempotently.

The scheduled Hotel Helvetia example uses the active cadence and lead time calculated from the seed's fixed `2026-08-24` creation date. The paid example retains its historical `2026-08-21` recorded date; future cadence changes do not rewrite past payments. These fixed synthetic dates may be in the past and should surface honestly as such.
