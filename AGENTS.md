# AGENTS.md

## Purpose and user

Keel targets self-contained employee expense and reimbursement management, with a key-free demo for a nontechnical operations or finance lead. It is not yet a production Concur replacement. The user answers business questions; Codex owns setup, processes, ports, files, Git, tests, and opening the app. Kisset/KISSKET is unrelated: leave it untouched.

## First-run conversation

On a fresh clone, before changing files or asking for technical details, ask one question: does the user want to (1) launch the current Keel demo locally, (2) customize Keel for their organization, or (3) use Keel as a reference to plan and build a different expense product?

- For launch, install from the lockfile, reset synthetic data, run the required checks, start the app and open the exact local URL.
- For customization, follow `docs/CUSTOMIZATION.md`, ask business questions only, apply supported settings through `npm run configure`, reset affected demo data, verify and open the result.
- For a different product, use the discovery questions in `START_HERE.md`. Separate configuration from feature work, update relevant specifications and tests, and preserve the financial and security invariants below.

Never ask the user to paste a key or token into chat. Never silently expose the local demo on a public host. If the user's intent is already explicit, do not repeat the chooser; proceed with that path.

## Commands

- Check prerequisites: `node --version` (needs Node 22.13+) and `npm --version`
- Install: `npm ci`
- Show the interactive setup chooser: `npm run setup`
- Start: `npm run dev`
- Reset local demo: stop the app, run `npm run reset`, then `npm run dev`
- Test everything: `npm run check`
- Rehearse from a disposable clone: `npm run acceptance:clean-room`
- Customize interactively: `npm run configure`
- Connect receipt/question AI privately: `npm run connect:ai` (visible masked terminal; never request a key in chat)
- Build only: `npm run build`

Open the exact local URL printed by `npm run dev`. If Node is missing or old, explain that one prerequisite simply and offer to install it. Never ask the user to run commands, diagnose ports, install a database, edit JSON, configure Docker, create a cloud account, or manage environment variables.

## Read by task

- Product behavior or feature work: `docs/PRODUCT_SPEC.md`
- Visual or interaction changes: `docs/DESIGN_CONTRACT.md`
- Database, API, exports, or financial logic: `docs/DATA_CONTRACT.md`
- Business setup/customization: `docs/CUSTOMIZATION.md`
- Rebuild or architecture decisions: `docs/BUILD_SPEC.md`
- Demo records/reset: `docs/DEMO_DATA.md`
- Final acceptance: `docs/CLEAN_ROOM.md`
- Concur replacement boundary and revised release gates: `docs/CONCUR_REPLACEMENT.md`
- Mandatory live receipt extraction and owner key setup: `docs/RECEIPT_AI.md`
- Grounded tasks, natural-language questions, saved answers and AI/production gates: `docs/AI_ASSISTANT.md`
- Access, sign-in and hosting safety: `docs/ACCESS_SECURITY.md` (all data APIs are currently local-development-only; never bypass the barrier to publish)

The application uses URL-driven simulated workspaces under `/workspace/:role/:view`; `/` remains the Employee overview. Role/view allowlists and canonical record-derived metrics, queues, activity and insights live in `lib/workspace.mjs` and `GET /api/workspace`. A role route is a demo lens, never authentication.

## Supported customization

Run `npm run configure` after interviewing the user. It writes supported values to `config/business.json`; do not ask the user to edit it. Supported settings are organization, accent, two-decimal currency, categories/limits, approvers and weekly/fortnightly/monthly reimbursement with calendar-day lead time. Read `docs/CUSTOMIZATION.md` for cadence-specific date choices. Product code must read those values rather than duplicate them.

Ask business questions only: organization identity, preferred brand color, operating currency, expense categories and limits, who can approve, and when reimbursements run. Summarize answers, run the configurator, reset demo data if category/currency changes, test, and open the result.

## Financial invariants

- Store and calculate money as positive integer minor units; never persist floats.
- Never trust a client-provided total, limit result, status, approver, or reimbursement date.
- Submitters cannot approve or reject their own expense.
- Approval/rejection requires the approver role; scheduling/payment requires finance.
- Never schedule before approval or mark paid before scheduling.
- Paid is terminal. Corrections require a new explicit feature and audit design.
- Policy exceptions stay visible and require an explicit decision; never silently relax a limit.
- CSV uses canonical stored data and two-decimal minor-unit conversion.
- Amount parsing, display and totals must remain exact; keep currencies separate and neutralize formula-capable CSV text without altering stored records.
- Scheduling must honor the configured cadence; changing it must not silently reschedule existing claims.
- Every state change writes an audit event in the same database batch.
- AI output is untrusted until reviewed; it cannot approve, waive policy, move money or silently convert currency. Never describe manual payment recording as an actual bank transfer.

Do not weaken these rules to satisfy a request. Explain the business safeguard and propose an auditable alternative.

## Unsupported requests

First distinguish configuration from a feature change using `docs/CUSTOMIZATION.md`. For a feature change, read the relevant specifications, explain the business behavior you propose, update specs and tests with the code, and preserve all invariants. Do not pretend an unsupported request is configurable or silently approximate it.

## Verify and finish

After any change: run `npm run check`. Before release, run `npm run acceptance:clean-room`; it creates and deletes its own temporary clone. For workflow/UI changes, also launch the app and exercise the affected role path, responsive layout, keyboard focus, errors, loading, and empty states. For customization, verify the new organization, color, categories, limits, approvers, and schedule in the rendered result.

Definition of done: specs/screenshots match; tests pass; key-free demo/reset and clean-room customization work; receipt → approval → reimbursement tracking works without CSV (export is additional). Mandatory live extraction, grounded assistant and production/migration gates in `CONCUR_REPLACEMENT.md` also pass. Mocked AI tests do not prove OCR. Keep secrets ignored and never publish without approval.
