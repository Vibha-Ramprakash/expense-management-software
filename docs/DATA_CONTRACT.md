# Data and financial contract

## Storage

Local development and hosted Sites use the same logical bindings:

- D1 binding `DB`: canonical expense records and audit events
- R2 binding `RECEIPTS`: uploaded PDF/image bytes

The application creates its tables and indexes idempotently on first data access. Drizzle schema in `db/schema.ts` is the declarative schema source used to generate checked-in migrations.

## Expense record

| Field | Contract |
| --- | --- |
| `id` | Opaque text primary key |
| `merchant` | Required trimmed text |
| `expense_date` | ISO calendar date |
| `amount_minor` | Positive safe integer; cents for EUR/USD-like currencies |
| `currency` | Configured recognized two-decimal currency; other minor-unit scales are not supported |
| `category` | Must match a configured category |
| `memo` | Required business purpose |
| `receipt_key` | Opaque R2 key; never a filesystem path |
| `submitter_id/name` | Server-selected demo actor |
| `status` | One of the documented workflow states |
| `over_limit` | Server-computed boolean stored as 0/1 |
| `approver_id/name` | Set only during approval |
| `reimbursement_date` | Server-computed during scheduling |
| timestamps | UTC ISO strings |

## Audit event

Every workflow transition creates a separate event in the same D1 batch as the status update. Events contain expense ID, event type, actor ID/name, note, and UTC timestamp. Product code treats events as append-only. Reset is the only supported demo operation that removes them.

Draft saves append `draft_saved`. Draft edits and transitions require the caller's last-seen `expectedUpdatedAt` and use a compare-and-swap predicate on the current status and `updated_at`; the timestamp advances monotonically. A conditional audit insertion and the matching mutation execute in one D1 batch. If the expected revision no longer matches, neither mutation nor audit insertion applies. Concurrent approval is not idempotently reported as a second success, and an outdated screen cannot approve revised claim details.

The schema is unchanged for drafts: amount/date/category/merchant are required, while an empty memo and null receipt key are allowed until submission. `PATCH /api/expenses/:id` accepts only the demo employee's draft, requires its `expectedUpdatedAt`, and may save or submit after validation. Rejection must be explicitly reopened first. Existing receipt references are retained when no replacement is uploaded. Failed newly uploaded files are removed only after confirming no claim references the key; replacements retain old bytes pending a production retention policy.

The attention digest is derived from canonical claims, not independently persisted task state. `assistant_answers` separately stores question/request ID, actor/role, pending/completed/error state, model, validated interpretation/provider ID/token usage, answer snapshot, safe error and timestamps. Request IDs are unique; an atomic conditional insert enforces the per-actor/role/UTC-day demo cap. The actor/role/created index serves history and quota queries. Completed answer links are immutable as-of evidence, not current account balances. There are no saved conversational-memory or external-notification records. Demo roles are not an access-control boundary.

Runtime initialization creates the assistant table and upgrades a pre-existing local table missing the nullable `generation_json` column without deleting history. Checked-in Drizzle migrations create the same table and column. Reset deletes assistant history along with claims/audit; it does not make or cancel an AI provider request.

## Server authority

The browser may propose receipt details and a desired action. It does not control the stored status, limit evaluation, approver identity attached to a decision, reimbursement date, or CSV totals. API routes revalidate each consequential value and the pure functions in `lib/finance.mjs` enforce money and transition rules.

All current API handlers enforce the temporary `demo-access.mjs` barrier before body parsing/storage. Non-development builds deny data access; local writes require an exact matching Origin, and cross-origin access is denied. This does not authenticate a person or isolate local demo roles. See `ACCESS_SECURITY.md` for the pending sign-in/membership choice and required route-level authorization before any hosted data access.

## Receipt rules

- Accepted: PDF, JPEG, PNG, WebP
- Maximum: 8 MB
- Bytes live in R2; the record stores only the opaque key and original name.
- Receipt retrieval uses a private same-origin route and a short private cache header.

## AI boundary

Receipt extraction sends only the selected receipt and configured category/currency context to OpenAI after consent. It returns untrusted, transient suggestions; no extraction route can mutate the ledger or audit history. The employee confirms facts before the normal submission path persists them. Unknown currency blanks the amount, and a detected different currency blocks the extraction-assisted UI; currency conversion is not implemented. A malicious client can still falsify manually entered facts, so this is not a fraud guarantee.

See `RECEIPT_AI.md` for local-only gating, size/signature validation, provider-data handling and live acceptance. `.dev.vars` is local secret configuration, never repository data. Production extraction provenance, real identity and per-user quotas remain required gates; the demo's client-selected roles are not authentication.

## CSV contract

The export includes ID, merchant, expense date, two-decimal amount, currency, category, business purpose, submitter, status, limit flag, approver, reimbursement date and `payment_recorded_at` (the final appended column). Values are RFC 4180-style escaped. Potential spreadsheet expressions (leading `=`, `+`, `-`, `@`, including after whitespace/control characters, or initial tab/newline/carriage return) receive a leading apostrophe before CSV quoting. Stored text is not altered; this export is a spreadsheet-safe copy, not a byte-identical raw interchange format. Do not remove the protection to make a spreadsheet evaluate user-entered text.

Amounts are derived from stored minor units, never browser display text. Decimal parsing uses integer arithmetic and rejects more than two fractional digits, separators and amounts above `90071992547409.91` rather than rounding. Individual persisted minor amounts remain positive safe integers. Formatting uses integer quotient/remainder; aggregate totals use BigInt and keep each currency separate, including when totals exceed the safe-integer storage range. Browser display/draft prefilling must use the shared exact helpers, not floating division or `toFixed`.

## Reimbursement date contract

`lib/reimbursement.mjs` validates and calculates weekly, fortnightly and monthly schedules in UTC calendar dates. Lead time is 0–30 calendar days, inclusive of an eligible same-day run. Fortnightly dates are anchored to a configured first run and advance in 14-day increments. Monthly runs clamp the configured day (1–31) to each month's last day without shifting subsequent months. The server computes the date on approval-to-scheduled transition; the client cannot supply it. Invalid cadence/weekday/anchor/day settings are rejected. Configuration changes never rewrite an existing scheduled or paid claim. Bank holidays, business-day cutoffs and actual settlement are outside this calendar contract.

## Invariants

For a terminal paid claim, `updated_at` is the timestamp of the finance action and equals its paid audit event's `created_at`. `lib/payment-reporting.mjs` derives `payment_recorded_at` from this canonical timestamp, never from the scheduled reimbursement date or purchase date. Other statuses have no payment-recording timestamp. The monthly tile groups these finance records by UTC calendar month and preserves separate exact currency totals. Invalid paid timestamps fail validation rather than inventing a payment date. No schema/backfill or existing data rewrite is needed. This is not evidence of bank settlement; a future feature allowing paid-record edits would require a separate immutable payment event field/migration before preserving this derivation.

The invariant list in `AGENTS.md` is normative. Any schema or API change must add or update tests that prove the affected invariant, regenerate the migration, and keep the clean-room path working.
