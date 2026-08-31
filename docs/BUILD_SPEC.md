# Build and reconstruction specification

## Architecture

- Next-compatible App Router UI compiled by vinext/Vite to a Cloudflare Worker-compatible ESM bundle
- React client workbench in `components/KeelApp.tsx`
- App Router API handlers under `app/api/`
- Local-demo access barrier in `lib/demo-access.mjs`, called before body parsing/storage by every API handler; production identity replacement requirements in `docs/ACCESS_SECURITY.md`
- Cloudflare D1 for structured records and R2 for receipt bytes
- Idempotent runtime initialization and demo seeding in `lib/store.ts`
- Pure financial/state rules in `lib/finance.mjs`
- Exact amount/CSV helpers in `lib/finance.mjs`, validated calendar scheduling in `lib/reimbursement.mjs`, and business-setting validation in `lib/business-settings.mjs`
- Terminal payment-record timestamps and UTC monthly reporting in `lib/payment-reporting.mjs`; planned dates must not determine the paid-month total
- Receipt AI adapter/validation in `lib/receipt-extraction.mjs`, review UI in `components/ReceiptForm.tsx`, private owner setup in `scripts/connect-ai.mjs`
- Draft validation in `lib/expense-validation.mjs`, shared receipt storage in `lib/expense-upload.ts`, derived attention logic in `lib/attention.mjs` and `components/AttentionPanel.tsx`
- Natural-language filter interpretation and canonical answers in `lib/assistant-query.mjs`; D1 reservations/history in `lib/assistant-store.ts` and `lib/assistant-sql.mjs`; question/history UI in `components/AssistantQuestions.tsx`
- Guarded Approver command interpretation/matching in `lib/approver-command.mjs`; preview/confirmation API in `app/api/approver/commands`, audited runtime policy overrides in `app/api/policy` and direct controls in `components/PolicyPanel.tsx`
- Role/view allowlists and canonical selectors in `lib/workspace.mjs`; `GET /api/workspace` is the read-only server-derived payload for navigation, metrics, scoped queues, activity and insights
- Business configuration in `config/business.json`, changed through `scripts/configure.mjs`
- Cross-platform vinext launcher in `scripts/run-vinext.mjs`; project commands do not rely on Unix shell syntax
- Disposable-clone workflow verifier in `scripts/verify-clean-room.mjs`
- Sites bindings declared in `.openai/hosting.json`

## Reconstruction order

1. Install the exact lockfile with Node 22.13 or newer.
2. Read `PRODUCT_SPEC.md`, `DATA_CONTRACT.md`, and `DESIGN_CONTRACT.md`.
3. Preserve `.openai/hosting.json`, the `sites()` Vite plugin, and Worker-compatible ESM output.
4. Implement the pure financial rules first and make their tests pass.
5. Implement D1 tables, indexes, idempotent initialization, demo seeds, and R2 receipt operations.
6. Implement API routes with server-authoritative validation and batched audit events.
7. Implement the URL-driven role workspaces and all specified states. Never compute an unscoped shared dashboard in the client.
8. Wire configuration through the supported map; do not duplicate business values.
9. Run `npm run check`, launch, exercise the full workflow, then run `npm run acceptance:clean-room` and complete the remaining visual/public checks in `CLEAN_ROOM.md`.

## Route contract

- `GET /workspace/:role/:view`: server-rendered application shell for an allowlisted simulated demo workspace; `/` aliases Employee overview and `?claim=…` deep-links a canonical record
- `GET /api/workspace?role=...&view=...`: read-only role-scoped metrics, queue, activity, insights and valid navigation derived from canonical expenses/audit events

- `GET /api/expenses`: canonical list
- `POST /api/expenses`: validated fields plus optional receipt; `intent=draft` saves a draft, default `submit` requires receipt/purpose
- `GET /api/expenses/:id`: claim plus audit history
- `PATCH /api/expenses/:id`: revision-checked edit of the employee's own draft; save or submit
- `POST /api/expenses/:id/actions`: validated workflow transition
- `GET /api/assistant?role=...`: role-scoped deterministic attention digest; not model-generated and not authentication
- `POST /api/assistant/answers`: local-only, consented AI interpretation followed by canonical answer generation and D1 persistence; idempotent request IDs
- `GET /api/assistant/answers?role=...&id=...`: local-only saved-answer list or one role-scoped snapshot, no model call
- `POST /api/approver/commands`: local-only, consented preview or confirmation of a saved bounded Approver plan; model output never supplies claim IDs
- `PATCH /api/policy`: configured-Approver-only demo update of one category limit, with immutable policy event and exception recalculation
- `GET /api/receipts/:key`: stored receipt bytes
- `POST /api/receipts/extract`: same-origin local-development-only receipt AI preview with consent; does not create an expense
- `GET /api/export`: canonical CSV ledger
- `POST /api/reset`: restore demo records

## Dependencies and constraints

- No API key is required for the manual local demo or CI. Live extraction requires the owner connection described in `RECEIPT_AI.md`; that feature is mandatory before release.
- No external service is required for the local demo.
- Do not replace D1/R2 with browser storage for product records.
- Do not add Docker or require a separately installed database.
- Keep commands cross-platform; project scripts use Node rather than shell-specific deletion.
- Production authentication is not implemented and is a release gate; the role switch exists only to exercise the demo. Every data API is disabled outside local development until verified identity, membership and record authorization replace the temporary barrier. Read `ACCESS_SECURITY.md`; do not enable a hosted demo by removing the guard.
- Follow `CONCUR_REPLACEMENT.md` and `AI_ASSISTANT.md` for the expanded target; do not rebuild only the original manual demo and call the product complete.
