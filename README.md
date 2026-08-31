# Keel

Keel is a self-contained Phase 1 expense and reimbursement MVP with a reproducible key-free demo. An employee captures a receipt, an approver makes a policy-aware decision, and finance schedules and records reimbursement inside the app. CSV is an optional copy, not a required workflow step. No actual bank transfers are performed.

Automatic receipt extraction and the in-app question adapter use an owner-configured private OpenAI connection with explicit consent. Synthetic image/PDF extraction, saved timestamped answers, restart recovery, canonical calculations, and refusal of action requests have been verified; the key-free rules-based task desk remains available without AI. See the explicit [Concur replacement map](docs/CONCUR_REPLACEMENT.md). This MVP is not a production Concur replacement: real employee authentication, payment transfers, integrations, migration, public-host verification, and other enterprise capabilities remain future work.

## Start locally or with an AI coding agent

Open [START_HERE.md](START_HERE.md) for a safe three-way setup: launch the finished demo, customize supported business settings, or use Keel as an agent-readable reference for a different expense product.

Send Codex, Claude Code, or another coding agent the GitHub URL and this instruction:

> Clone this repository, read `AGENTS.md` completely, and ask whether I want to launch Keel, customize it, or plan a different expense product from this reference. Own the technical setup and ask me business questions only.

The agent handles setup, explains any missing prerequisite plainly, opens the app, interviews you, applies supported settings, and verifies the result. You do not need to understand Git, databases, Docker, environment variables, or testing tools. Terminal users can run `npm ci` followed by `npm run setup` for the same chooser.

## What the demo includes

- Receipt upload for PDF, JPG, PNG, and WebP files
- Automatic extraction integration with consent, editable suggestions, currency safeguards, and verified synthetic image/PDF examples ([private AI setup](docs/RECEIPT_AI.md))
- URL-driven Employee, Approver, and Finance workspaces with distinct navigation, metrics, records, attention queues and actions
- Deep claim links, browser history/reload support, decision history, payment history, reimbursement timeline and compact spend/calendar views
- Saved drafts, missing-receipt tracking, receipt attachment and returned-claim correction/resubmission
- A role-aware assistant view grounded in saved claims, with pending approvals and reimbursement next steps; optional AI question interpretation with persistent answer history, record-derived facts and explicit limitations
- Category limits and visible above-limit policy flags
- Live policy feedback, exact-match duplicate warnings, three-day waiting indicators, required request-changes notes and optional finance references
- Enforced receipt-to-submission-to-approval-to-payment workflow
- Weekly, anchored every-two-weeks and monthly reimbursement calendars, with explicit lead time and short-month behavior
- Append-only audit events at the application layer
- Persistent local demo data with one-command reset
- Exact-cent amounts and separate per-currency totals; optional spreadsheet-safe CSV export from canonical records
- A guided business configuration interview
- A disposable-clone acceptance verifier for the complete default and customized workflows
- Responsive mobile camera capture plus a centered receipt-preview/editor workbench on desktop and mobile
- A verification workflow for macOS, Windows, and Linux

No API key, cloud account, Docker setup, or database installation is required for the manual local demo. Live AI uses a separate owner-provided API connection and billed usage; keep keys out of chat and Git. Codex handles the private local setup.

Until real employee sign-in and permissions are verified, data APIs run only in local development. A production build deliberately denies record, receipt, export, reset and AI access rather than publishing an unprotected expense system. See [access security and the sign-in decision](docs/ACCESS_SECURITY.md). Do not expose the development server publicly.

Technical and agent-facing details live in [AGENTS.md](AGENTS.md). Product and rebuilding specifications live in [docs/](docs/). Codex can run the entire reproducibility rehearsal with `npm run acceptance:clean-room`; the user never needs to run it manually.
