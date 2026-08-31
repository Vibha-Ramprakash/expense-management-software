# Product specification

## Product promise

Keel gives an organization one self-contained path from receipt to reimbursement. It targets employee expense management currently handled in Concur, with automatic extraction, visible responsibility, policy context, reimbursement tracking and a grounded workflow assistant. CSV is optional and never a required handoff. See `CONCUR_REPLACEMENT.md` for the explicit parity boundary and outstanding production gates.

The demo still starts without accounts or API keys and exposes role switching so one evaluator can complete the workflow. Each role is a real URL workspace with its own destinations, metrics, records, empty states and valid actions; this is simulated owner-demo identity, not authentication. Live extraction requires one-time owner AI setup. The assistant surfaces tasks from saved claims and includes a consented natural-language question adapter with persistent, timestamped answers.

Routes are `/workspace/employee/{overview|expenses|attention|policy}`, `/workspace/approver/{overview|approvals|attention|history|policy}`, and `/workspace/finance/{overview|reimbursements|attention|insights|history}`. `/` is a backward-compatible Employee overview. Claim details use `?claim=…` and survive reload/back navigation without changing the active workspace.

Data routes are temporarily disabled in non-development builds to prevent accidentally hosting unprotected employee records. Local origin checks protect demo requests but are not real-user authentication. Confirm employee sign-in requirements and complete `ACCESS_SECURITY.md` before enabling hosted data access; this is an open product gate, not a change to the final self-contained-app target.

## Primary users

### Employee

- Uploads a PDF or image receipt.
- Consents to send that receipt to OpenAI; once a file and consent are both present, exactly one extraction starts automatically. The employee reviews editable suggestions and fixes uncertain fields. See `RECEIPT_AI.md`.
- Confirms merchant, date, amount, category, and business purpose.
- Sees status and reimbursement timing without contacting finance.
- Cannot approve their own claim.
- Saves a draft while a receipt or business purpose is missing; merchant, date, category and positive amount remain required. Completes the draft later without creating a duplicate claim.
- Reopens their rejected claim to correct and resubmit it. Submitted/approved/scheduled/paid claims cannot be edited in place.
- Receives live category-limit feedback and must acknowledge an exact merchant/date/amount/currency duplicate warning before submission; neither warning blocks draft saving.

### Approver

- Reviews the receipt, business purpose, amount, and category.
- Sees above-limit flags before acting.
- Approves with an optional note or requests changes with a required decision note. Notes are immutable audit events. The submitting employee may reopen a returned claim, correct it and resubmit.
- Uses the local-demo Command desk to interpret one bounded instruction: preview submitted claims in one category below/at-or-below one amount, or preview one category-limit change. Keel—not the model—selects canonical records, shows the exact matches, and requires explicit confirmation before mutation. Confirmed approvals create normal per-claim audit events.
- Changes a category limit directly from Expense policy when AI is unavailable. Runtime overrides and their policy events reset with demo data; supported repository-level defaults remain in `config/business.json`.

### Finance

- Sees approved claims ready for reimbursement.
- Schedules an approved claim on the configured reimbursement cadence.
- Records payment only after scheduling.
- Sees amounts recorded paid in the current UTC month, based on finance's action time, not the planned reimbursement date. No settlement is inferred.
- Uses the in-app ledger; optionally downloads a CSV copy.
- May add an optional internal reference when scheduling or recording payment; the UI states that this records activity and never transfers money.

## Default workflow

1. Employee chooses or photographs a receipt. With explicit consent, automatic extraction starts once, fills supported facts, and remains fully editable. The employee confirms the facts and manually adds a business purpose. Manual entry keeps the no-key demo available.
2. The server converts the decimal amount to integer minor units and evaluates the configured category limit.
3. The claim enters `submitted` and becomes available to an approver.
4. An approver who is not the submitter chooses `approved` or `rejected`.
5. Finance schedules an approved claim using its configured weekly, fortnightly or monthly calendar rule and lead time. Existing schedules do not change when the business configuration changes; see `CUSTOMIZATION.md` for date semantics and banking exclusions.
6. Finance marks a scheduled claim `paid`.
7. Optionally export the canonical ledger; the workflow is already complete without export. In the demo any role can export; production must restrict access using real identity.

“Paid” currently means finance recorded payment, not that Keel transferred money. Direct payout requirements depend on the paying entity/country and provider selection; no banking capability is implied.

Allowed transitions: `draft → submitted`, `submitted → approved|rejected`, `rejected → draft`, `approved → scheduled`, `scheduled → paid`. Paid is terminal.

## Required states

- Loading: the queue announces that it is loading.
- Empty: filters/search show a useful empty message.
- Validation error: the server returns a plain-language error displayed as a toast.
- Above limit: visible in the queue and detail view; it does not block an explicit approver decision.
- No action: the detail view explains when the selected demo role has no valid action.
- Missing receipt: upload form blocks submission; the server validates supported file types and size.
- Incomplete draft: saved with visible missing-receipt/purpose tasks; cannot submit until complete.
- Concurrent edit: a stale draft or workflow action is rejected without a false audit event. Reopen/refresh before retrying.
- Assistant: loading/error/empty and as-of states; factual tasks link to claims. No model or external notification success is implied.
- Approver command: explicit consent, preview, exact match list, confirmation and completed/error states. Unsupported commands never mutate records.

## Required expansion and exclusions

- Mandatory next gates: live extraction acceptance, live natural-language assistant acceptance (including semantic accuracy and provider-to-history completion), production identity, access control, backups and audit retention.
- Integration-dependent: card feeds, accounting/payroll sync, external notifications and actual bank transfers.
- Not currently supported: FX conversion, tax reclaim, complex itemization, mileage/per diem and advanced approval routing. Do not claim Concur parity for these.
- Never edit a paid claim in place; reversals require an auditable explicit feature.

These are feature changes, not settings. They require specification, authorization, migrations, security review, and tests.
