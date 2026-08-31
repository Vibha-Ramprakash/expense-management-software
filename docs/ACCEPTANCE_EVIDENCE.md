# Acceptance evidence

### Guarded Approver commands and policy controls — 2026-08-31

- The Approver overview now contains a responsive Command desk with explicit OpenAI consent, preview, exact canonical match list and separate confirmation. Live interpretation of “Approve submitted Travel claims below €100” returned exactly City Transfer (€42.80) and Lumen House Hotel (€86.40); no claim changed during the preview. Matching code excludes self, non-submitted, other-category/currency and exactly-€100 records for a strict-below rule.
- Expense policy provides a direct category/amount control. Live disposable-data verification changed Meals from €75.00 to €100.00, persisted an approver override/policy event and recalculated exceptions; reset removed the override and restored eight seed records.
- The generated 2,722,604-byte PNG fixture `docs/demo-fixtures/lumen-house-hotel-eur-86-40.png` live-extracted Lumen House Hotel, 2026-08-31, EUR 86.40 and Travel with the privately configured key. The key was neither read nor printed. The provider correctly warned that it is a demo/not-valid receipt.
- Production build, lint, typecheck and all 57 tests pass in the disposable local mirror. Desktop and 390×844 mobile evidence are `keel-approver-command-desk-desktop.png` and `keel-approver-command-desk-mobile.png`.
- The committed-source clean-room rehearsal passed from the same code snapshot: locked install with zero audit vulnerabilities; default, customized fortnightly and customized monthly lint/typecheck/build/57-test passes; eight-record delete/relaunch restoration; full receipt-to-payment-record workflows; draft/duplicate protection; exact money/CSV safeguards; origin barriers; and schedule preservation.

Status: the local Phase 1 MVP finish line is proven. Publication is not authorized, so public-URL reproduction, live cross-platform Actions, production identity, and hosting remain deliberately open. Those future/publication gates do not expand Phase 1 into a full Concur replacement.

## Scope change — 2026-08-27

Evidence is tied to the commits and scopes below; historical manual-demo results do not prove the expanded Concur replacement target. The user now requires automatic extraction, a self-contained workflow with optional CSV, and an in-app assistant. See `CONCUR_REPLACEMENT.md` for the full delivery matrix. Receipt extraction, rules-based attention, natural-language question interpretation, durable answers, and live AI verification are implemented. Production identity, external integrations, and migration readiness remain outside Phase 1.

### URL-driven role workspaces and Balanced MVP+ — 2026-08-31

- Keel no longer uses a shared scrolling workbench. Employee, Approver and Finance have allowlisted URL destinations, distinct navigation, identity, metrics, scoped records, empty states and primary actions. `/` remains Employee overview; `?claim=…` deep links survive reload and browser Back. The server-derived `WorkspacePayload` is built only from canonical expenses and audit events.
- Employee sees only Noah Williams’s demo claims, live policy-limit feedback, exact-match duplicate acknowledgement, waiting-age indicators, next actions, personal activity and a reimbursement timeline. Approver sees assigned submitted claims, receipt/purpose/age/policy context, optional approval notes, required request-changes notes and decision history. Finance sees only approval/scheduling/payment work, an explicit record-only money disclaimer, optional internal references, reimbursement calendar, category breakdown, recent activity and payment history.
- The native receipt dialog is exactly centered at 1440×1000, 768×900, 390×844 and 360×780. Desktop uses a two-column preview/editor; mobile uses a safe single-column workbench with collapsible preview, camera-capable file input, internal scrolling and sticky actions. At 390px the app has no page-level horizontal overflow.
- With the ignored private connection present, selecting the synthetic `meals-eur.png` receipt and granting consent sent exactly one `/api/receipts/extract` request. It returned HTTP 200 and automatically filled Harbor Lunch Counter, 2026-08-26, EUR 22.50 and Meals. No key value was read, printed, copied or committed. The fields remained editable and the business purpose remained manual.
- A 3,953,022-byte PNG of Harbor & Thyme Bistro exposed Vinext's default 1 MB multipart bridge limit: the browser received plain-text HTTP 413 and previously surfaced a JSON parser message. The bridge now allows 9 MB so Keel's own exact 8 MB file cap remains authoritative, and non-JSON responses are translated into safe guidance. Replaying the same file returned HTTP 200 and extracted Harbor & Thyme Bistro, 2026-08-30, CHF and Meals. Amount remained blank because the EUR workspace must not convert or relabel CHF; the receipt's inconsistent printed subtotal/tax/total was explicitly flagged for review. Browser upload produced no console warnings. Lint, typecheck, production build and all 55 tests pass after the fix.
- Browser verification proved role switching, genuine sidebar navigation, reload/back behavior, deep claims, decision-note persistence, finance-reference persistence, duplicate blocking/acknowledgement, policy feedback, Escape dismissal and mobile navigation. WCAG A/AA automated audits at desktop Approver and mobile Employee states reported zero violations; the error-overlay check returned clear.
- Production build, lint, TypeScript and all 52 tests pass in the isolated working-source snapshot. New tests cover role/view allowlists, scoped queues/metrics, activity/insight derivation, server-rendered role destinations and the expanded API access-barrier inventory.
- The final `npm run acceptance:clean-room` rehearsal passed on 2026-08-31 from committed source mirror `63ea3f23d541c6ace4b72a8b0f1d9b55ee9acd29`. It installed only locked dependencies, passed lint/typecheck/production build/all 52 tests under the default, customized fortnightly, and customized monthly policies, restored six seed records after deleting local data, and completed independent receipt-to-payment-record workflows. It also reconfirmed exact-money handling, draft completion without CSV, duplicate-action protection, schedule preservation, no-key honesty, cross-origin denial, ledger integrity, and zero npm audit vulnerabilities. The rehearsal exposed and fixed missing employee-side schedule visibility; the overview now renders both run day and cadence after configuration.
- The committed mirror was required because the macOS FileProvider created unrelated duplicate local branch-ref metadata (`main 5` and `main 6`) that stalls a native clone of the synchronized working folder. Those files and all unrelated ` 2` files were preserved. No application source, secret, or acceptance behavior depends on that local metadata; publication will create a normal public Git repository and repeat the verifier from its URL.
- Current source evidence is `keel-employee-workspace-desktop.png`, `keel-approver-workspace-desktop.png`, `keel-approval-detail-role-workspace.png`, `keel-finance-workspace-desktop.png`, `keel-employee-workspace-mobile.png`, `keel-mobile-navigation.png`, `keel-receipt-autofill-desktop.png`, and `keel-receipt-autofill-mobile.png` under `docs/screenshots/`.
- These remain simulated owner-demo personas. Production SSO/organization authorization, real transfers, card/bank feeds, accounting integrations, travel, supplier AP, migration, offline/native applications and full Concur parity are intentionally outside Phase 1. Publication, public-URL cloning, live cross-platform Actions and hosting remain pending explicit authorization.

### Operational heading audit — 2026-08-29

- The employee, approver, and finance workspaces now use literal product headings: “Employee expenses,” “Expense approvals,” and “Reimbursements.” The queue is “Expenses,” receipt entry is “Add expense” or “Complete expense,” and the policy section is “Expense policy.” “What needs your attention?” remains unchanged by explicit user decision.
- The sidebar now contains only real destinations: Overview, Expenses, Attention, and Expense policy. Duplicate links to the same queue and the dead People link were removed. The oversized headline scale was reduced to an application-level hierarchy, and the receipt action now says “Add a receipt” rather than implying unimplemented drag-and-drop.
- Targeted ESLint, full TypeScript checking, the production build, and all 48 tests passed in the isolated working-source snapshot. A new regression test covers every role and entry-state heading and rejects the removed promotional language. The required single source quality-detector pass returned no findings.
- The audit used the user's actual screenshots plus source and rendered-output verification. Automated browser interaction and responsive visual evidence remain pending because the localhost browser URL policy is unchanged.

### Phase 1 browser and live-receipt acceptance — 2026-08-30

- The actual local application was exercised in the permitted in-app browser at desktop, tablet, and mobile widths. The verified viewports were 1440×900, 1024×900, 768×900, 390×844, and 360×800. There was no page-level horizontal overflow. At 360 px, Employee, Approver, and Finance remain fully visible and each role button is 38 px high.
- A real synthetic PNG was attached through the receipt chooser and sent once through the consented production OpenAI adapter using the privately configured ignored key. It returned Harbor Lunch Counter, 2026-08-26, EUR 22.50, and Meals, plus the expected synthetic-data review warning. The merchant remained editable, the business purpose was supplied, and submission stayed blocked until the user-confirmation checkbox was checked. The key value was never read, printed, copied, or committed.
- The browser flow then completed employee submission, Maya Chen approval, Julian Hart scheduling for 2026-09-04, and payment recording. The final claim contained submitted, approved, scheduled, and paid audit events. This changed only the local demo ledger and did not move money. `npm run reset` then cleared local state; relaunch automatically restored exactly six default records and the expected totals/tasks.
- Manager evidence included the existing EUR 94.20 Meals claim with both the table-level “Above limit” flag and an explicit policy-check panel. Finance controls appeared only after approval. The role-aware “What needs your attention?” heading and task links remained unchanged and updated through the workflow.
- Mobile interaction covered the navigation scrim, stacked receipt form, responsive queue, and full-width claim drawer. Opening an overlay drawer focused its labeled heading, set `aria-modal`, made the background inert, accepted Escape, and returned focus to the exact claim link. The receipt dialog focused Close and locked background scrolling. Native controls, visible focus styles, labels, status announcements, and keyboard Escape/focus return were confirmed; the browser console reported no warnings or errors.
- Actual-app PNG evidence is committed as `docs/screenshots/keel-desktop.png`, `docs/screenshots/keel-mobile.png`, and `docs/screenshots/keel-approval-detail.png`. The narrow role switcher and modal background-scroll findings discovered during the pass were corrected without changing the operational information hierarchy or restoring promotional headings.
- The live receipt result supplements the 2026-08-28 three-receipt/four-question acceptance below. The assistant remains read-only: the model interprets a question, while application code reads canonical records and computes all counts, totals, statuses, dates, and links.
- `npm run acceptance:clean-room` passed from committed source `06d0b497ed9cb8397c9960d04dfb7f6a37e2af3e` (started `2026-08-30T13:24:17.805Z`). A disposable clone passed locked installation, lint, typecheck, production build, and all 48 tests under default weekly, customized fortnightly, and customized monthly configurations. Default reset restored the six seed records; Aster Works customization changed the organization name, accent, currency, categories, limits, approvers, and reimbursement schedule without application-code edits. Exact-money, unsafe-value rejection, CSV-neutralization, origin/access barriers, duplicate-action, no-key assistant, draft-without-CSV, schedule-preservation, and ledger-integrity checks all remained green. `npm audit` reported zero vulnerabilities.
- Public GitHub cloning, live GitHub Actions, owner-access hosting, and the fresh public setup-prompt rehearsal remain pending explicit publication authorization. Production multi-employee identity, real settlement, integrations, migration, and full Concur parity remain outside Phase 1.

### Billing resolved; live extraction and saved-answer workflow — 2026-08-28

Application source was `c1d50e3` (no product-code changes for these tests). The API workflow ran in the isolated working-source snapshot `/private/tmp/keel-ai-verification.hu19Yt`, not a new public clone or the owner's original database. Its private key connection referenced the original ignored file without copying the value into source/evidence. This supersedes the quota blocker below.

| Live test using `gpt-5.4-mini` | Result |
| --- | --- |
| PNG: Harbor Lunch Counter, 2026-08-26, EUR 22.50 | Direct production adapter returned 200 at 09:23 UTC; merchant/date/amount/currency/Meals category matched; review required |
| PDF: Alpine Rail, 2026-08-25, EUR 54.20 | Live app endpoint returned 200; all fields/Travel category matched; review required |
| PDF: Maple Cafe, 2026-08-24, USD 25.60 | Live endpoint returned 200; USD mismatch flagged, amount null, no currency conversion |
| Approver: “Which expenses are waiting for approval?” | 3 claims / EUR 326.80 matched canonical submitted claims and links |
| Finance: “Which reimbursements are scheduled?” | 2 claims / EUR 540.20 matched canonical scheduled claims and links |
| Employee: “Which of my expenses are missing receipts or business purpose?” | 6 active own claims / EUR 1027.60 matched canonical missing information and links |
| “Approve all pending claims now.” | Action refused; complete ledger unchanged |

- Seven real model requests were made: three receipt tests and four questions. No personal receipt was sent. PDF fixtures were rendered and inspected for readability using the PDF workflow; they are not screenshots of the app. Reusable inputs and rehearsal instructions are in `LIVE_AI_ACCEPTANCE.md`.
- The live HTTP workflow ran `2026-08-28T09:26:11.913Z`–`09:26:24.935Z`. Extraction alone left the ledger unchanged. The confirmed EUR PDF was submitted for 5420 minor units and retrieved byte-for-byte, approved, scheduled for `2026-09-04`, and recorded paid at `2026-08-28T09:26:22.695Z`. Its audit timestamp matched the record. All financial actions were explicit test harness actions, not actions taken by the assistant or a real transfer.
- Completion did not depend on CSV; an additional export afterward matched EUR 54.20 and the separate scheduled/recorded dates. A synthetic missing-receipt/purpose draft appeared in attention, while the paid claim left active attention.
- Three successful query IDs replayed with `reused=true` and identical saved entries; conflicting-question reuse returned 409 and another demo role's lookup returned 404. All four answers, usage metadata and the paid claim survived stopping/restarting the app and read-only retrieval. No further AI request was needed for recovery. The model was not given the ledger; canonical counts/totals/links were computed and independently compared locally.
- This is a small, clear synthetic test set. It does not certify difficult-receipt accuracy, live timeout recovery, browser consent/correction/navigation, mobile layout, real identity, bank settlement or production authorization. Owner-only ChatGPT sign-in is decided but not implemented. Existing production denial remains in place and publication is not authorized.

### Private key connected; live request quota-blocked — 2026-08-27

- The owner saved the API key through the private terminal flow. The ignored `.dev.vars` file has POSIX mode `0600`; its value was not printed, committed or copied into test evidence.
- At `2026-08-27T20:35:11.331Z`, the production extraction adapter made one real OpenAI Responses request using `gpt-5.4-mini`, a readable synthetic PNG (Harbor Lunch Counter, 2026-08-26, EUR 22.50) and the normal strict schema.
- OpenAI returned HTTP `429`, with safe error code `insufficient_quota`. No extraction fields were returned. Further live requests, including PDF/foreign-currency/assistant tests, were stopped pending available API credit/limits. This proves a provider response, not OCR accuracy or a working AI workflow.
- No financial record was created or changed by this adapter-only attempt. No personal receipt was sent. Synthetic PDF/image fixtures are test intermediates, not screenshots of the app or successful extraction evidence.
- The owner selected an owner-only ChatGPT-sign-in demo. `ACCESS_SECURITY.md` records the choice; live sign-in is not implemented or verified, and the production access barrier was not weakened. Real employee production authorization remains a separate gate.

Historical entries below describe their stated time and commit; earlier “key absent” and “sign-in undecided” observations are superseded by this entry. Publication is still not authorized.

### Payment recording versus planned reimbursement — latest rehearsal, 2026-08-27

`npm run acceptance:clean-room` passed from committed source `e28ef7c66ce5bfdaa7c902a6551337f75f8707d5` (started `2026-08-27T10:13:41.534Z`). All 47 tests, lint, typecheck and build passed under default weekly, customized fortnightly and monthly configurations in a fresh disposable local clone. The prior no-key, exact-money, access-barrier, reset, correction-without-CSV and configuration-independence checks remained green.

- Default reimbursement was scheduled for `2026-09-04` but recorded paid at `2026-08-27T10:14:07.075Z`; the paid claim's `updated_at`, paid audit event and appended CSV `payment_recorded_at` agreed. The fortnightly/monthly paths independently verified the same distinction. No bank transfer was performed.
- Three new tests cover early/late recordings, UTC year/month boundaries, exact currency-separated totals and rejection of invalid timestamps/months. The monthly UI now derives its total from finance's recording month, not the scheduled date. Rendered tests assert “Recorded paid this month” and “Finance record · UTC” rather than “Settled.” Actual browser layout/interaction remains unverified.
- Existing data was not rewritten; the derivation relies on paid being terminal and the paid transition writing its audit event and record timestamp together. A future paid-edit feature must preserve this contract explicitly.
- The original app and CSV endpoint returned HTTP 200. The temporary clone was removed, and original user data/defaults remained intact.
- The public setup prompt was corrected to require completion without CSV, with optional export checked separately. The clean-room checklist now distinguishes its synthetic upload fixture from the still-required readable receipt/browser/OCR checks.

Release audit: no Git remote is configured, no screenshots are tracked, and the documented private `.dev.vars` setup file is absent (presence check only; no secrets were read). The employee sign-in question remains unanswered. Live AI, browser/visual approval, production identity/retention/backup/migration safeguards, public-URL reproduction and actual cross-platform Actions are not proven. Local passing checks do not close those gates or authorize publication.

### Local-only access barrier — 2026-08-27

`npm run acceptance:clean-room` passed from committed source `efa59bd096d9537d336671f481942e88460caa6d` (started `2026-08-27T10:07:21.497Z`). All 44 tests, lint, typecheck and production build passed under default weekly, customized fortnightly and monthly settings in a fresh disposable local Git clone. Locked dependency installation reported zero advisories and informational install-script approval warnings.

- The production-build test discovered and exercised all 12 exported API handlers. Each returned non-cacheable `503` before storage/binding access, even with identity-looking headers and invalid request bodies. Node used a test-only trap for the `cloudflare:workers` module; the handlers and guard were real compiled output. This is not a live Sites authentication test.
- Local default/customized HTTP checks rejected originless and foreign-origin create/edit/action/reset attempts, plus foreign-origin record/detail/export/assistant/receipt reads. The ledger was unchanged afterward. Unit checks additionally cover exact port/host matching, Fetch Metadata and untrusted forwarded-host headers.
- Authorized local requests (including explicit same-origin headers on scripted writes) still completed receipt/approval/scheduling/payment recording/optional CSV, draft correction without CSV, exact-amount/export protection, reset restoration and missing-key assistant behavior. Weekly/fortnightly/monthly workflow dates were `2026-09-04`, `2026-09-10` and `2026-08-31`; the existing paid date survived the cadence change.
- Only `config/business.json` changed inside the rehearsal clone. The verifier removed its own clone; original demo data, source defaults, Kisset and unrelated untracked files were left untouched. The local preview returned HTTP 200 at `http://localhost:3000/`.

Real identity is not implemented. The Sites authentication guidance requires confirming the supported sign-in path; the employee company-account versus ChatGPT-account decision has been requested. Do not remove the deployment barrier to substitute a publicly exposed demo for the requested secure product. Live AI, browser/visual acceptance, real authorization, migration/backup safeguards, publication and live cross-platform CI remain open.

### Exact money and actual reimbursement cadences — 2026-08-27

`npm run acceptance:clean-room` passed from committed source `cf8ba0fbc9d97debde32c053572eddacef7cbe7e` (started `2026-08-27T09:38:22.693Z`). The fresh disposable local Git clone passed lint, typecheck, production build and all 41 tests under three configurations: default weekly, customized fortnightly and customized monthly. No API key, parent-project files or existing database were needed. Locked installation reported zero advisories; informational install-script approval warnings remained.

- Default Friday/two-day lead produced `2026-09-04`. Aster Works used USD, different categories/limits/approvers/accent and an anchored fortnightly Thursday run starting `2026-08-27`, with three-day lead; scheduling produced `2026-09-10`, not the following weekly Thursday. Monthly day 31 then produced `2026-08-31`.
- Receipt → approval → scheduling → payment recording → audit/receipt retrieval → optional CSV passed under all three cadences. Default and fortnightly configurations also passed draft/rejection/correction completion without CSV, stale/duplicate approval protection and the no-key assistant guards.
- Changing from fortnightly to monthly preserved the existing paid claim's `2026-09-10` date. Scheduled seed examples reflected the active calendar policy. Reset restored six seed records. Only `config/business.json` changed inside the clone; source defaults and original user data were not reset.
- Default and fortnightly API checks created and edited a draft for exactly `90071992547409.91`, retained `9007199254740991` minor units and exported the exact cents. The next cent was rejected without changing the stored amount or adding an audit event. Formula-like merchant/purpose fields remained unchanged in canonical records but received spreadsheet-safe apostrophe protection and correct quote/newline escaping in CSV.
- New unit coverage checks 300 adjacent values at the safe-integer boundary, exact BigInt totals beyond that boundary, separate currencies, invalid precision/separators, weekly UTC boundaries, fortnightly anchoring, monthly leap/short months and invalid schedules. The real configurator is exercised in a disposable folder: invalid settings leave the original file byte-for-byte unchanged; valid cadence changes persist only their applicable fields. Unsupported zero-/three-decimal currencies and duplicate categories/approvers are rejected.
- The first rehearsal found a test fixture expecting LF text after multipart encoding, which uses CRLF. The fixture/expectation was corrected; stored data and export protection were not relaxed.
- The original preview returned HTTP 200 at `http://localhost:3000/`. The existing Sites architecture and visual structure were preserved; changed labels/amount formatting pass source/render checks, not a browser visual pass. Temporary rehearsal data was removed by the verifier.

These checks do not prove live AI, real bank settlement, browser/keyboard/responsive behavior, production identity or public cross-platform CI. Those release gates remain open.

### Natural-language assistant rehearsal — 2026-08-27

`npm run acceptance:clean-room` passed from committed source `9412c03782da0af884e98f4995444050455686d5` (started `2026-08-27T09:24:17.139Z`). This was a fresh disposable Git clone of the local repository, with no API key, parent project, development database or untracked files copied. It is not yet a clone from a public GitHub URL.

- Default and customized copies each passed lint, typecheck, production build and all 31 tests. The isolated working-source snapshot also passed the same 31 tests. Locked dependency installation reported zero advisories and informational install-script approval warnings.
- Both clones completed the receipt-to-optional-CSV workflow and the draft → missing-information task → submission → rejection → correction → approval → reimbursement-tracking path without CSV. Stale and duplicate approvals were blocked. Deleting the disposable database restored the demo.
- Aster Works customization changed only `config/business.json`, including organization, accent, currency, categories/limits, approvers and reimbursement schedule. Default/custom workflow reimbursement dates were `2026-09-04` and `2026-09-03`.
- HTTP checks in both clones verified explicit consent enforcement, an honest missing-key response, no fabricated saved answer and cross-origin rejection. A server-level plain-text `403` is accepted as rejection; the test does not require the request to reach the JSON handler.
- Eight additional tests cover mocked structured question interpretation, provider failures, untrusted plans, role-scoped canonical answers, read-only action refusals, missing/aged/overdue/paid queries, exact mixed-currency totals and link truncation. A real in-memory SQLite test applies the generated migrations and production reservation SQL to verify request-ID reuse, the per-actor/role daily cap and preservation of existing answers.
- The model receives the question, role and current date, not ledger records or receipt files. Application code calculates all financial facts. Saved interpretations include available model/token metadata; estimated cost remains unknown rather than invented.
- Independent source review found and resolved repeat-question stale-state handling, saved-answer focus/navigation and the distinction between creation time and factual snapshot time. The one source quality-detector pass reported no findings. These are source-level checks, not browser or keyboard evidence.
- The local preview returned HTTP 200 at `http://localhost:3000/`. The verifier removed only its own disposable clone; original user data and repository defaults were not reset.

No real AI request was made. Live receipt accuracy, successful provider → answer persistence end-to-end behavior, reload/restart recovery in the browser and actual keyboard/responsive interaction remain unverified. A key and permitted browser verification are still required; mocked tests do not close those gates.

### Receipt AI implementation verification

- `npm run check` passed in an isolated working-source snapshot at `/private/tmp/keel-ai-verification.hu19Yt`: lint, typecheck, production build and all 15 tests. Dependencies were freshly installed from the lockfile; npm audit reported zero advisories.
- This was a source snapshot, not the final committed/public clean-clone rehearsal. Unrelated pre-existing ` 2` duplicate files and all local secrets/state were excluded. Root verification stalled resolving the parent project's unrelated Next.js type declarations; the original files were not changed to work around that stall.
- Eight new deterministic extraction tests cover structured image/PDF requests, absent keys, file size/signatures, ambiguous values, currency mismatch, incomplete/refused responses, safe provider errors and same-origin development-only access. They use mocked provider responses, not live OCR.
- Rendered-output tests verify the receipt AI entry point and disclosure exist. The local preview returned HTTP 200, and a no-consent extraction request returned the expected refusal without an AI call.
- No real receipt or API key was sent to OpenAI. Live accuracy, in-browser interaction and image/PDF end-to-end extraction remain unverified. The browser URL policy still prevents automated localhost UI verification.

### Expanded clean-room rehearsal — 2026-08-27

`npm run acceptance:clean-room` passed from committed source `e99e431f28f922f9395213e0ee6ccb84c50c33a2` (started `2026-08-27T09:06:52.590Z`). This was a fresh disposable local Git clone, not a working-source snapshot. Only repository contents and installed locked dependencies were used; no API key, parent project, development database or untracked duplicate files were copied.

- Default and customized copies each passed lint, typecheck, production build and all 23 tests. Installation reported zero dependency advisories; npm emitted informational install-script approval warnings.
- Both copies completed receipt upload, policy flagging, independent approval, scheduling, payment recording, audit retrieval, receipt retrieval and optional CSV export.
- A second complete path in each copy saved a draft missing its receipt/purpose, surfaced its missing-information task, blocked incomplete submission, attached a receipt, submitted, rejected, reopened, corrected and resubmitted the same claim. It retained the attached receipt and completed reimbursement tracking without any CSV request.
- An outdated pre-correction approval was rejected. Two simultaneous approvals produced exactly one success and one rejection, with only one approved audit event. Paid claims disappeared from the active attention digest.
- Deleting the disposable database and relaunching restored six demo records and removed rehearsal claims.
- Customization changed organization to Aster Works, accent to `#82E6D0`, currency to USD, category names/limits to Rail & travel 1800, Meals 95, Subscriptions 500, Equipment 1200 and Projects 400, approvers to Rina Shah/Tom Vale, and schedule to Thursday with three days' lead time. Only `config/business.json` changed in the clone. Default/custom workflow reimbursement dates were `2026-09-04` and `2026-09-03` respectively.
- The expanded category name containing `&` exposed a test assertion that compared raw text with escaped HTML. The assertion now checks correct HTML escaping; the app's safe escaping was preserved.
- The verifier removed its own disposable clone after completion. Source defaults and local user data were not reset. The original preview returned HTTP 200 at `http://localhost:3000/` after the run.

The first clone attempt exposed three invalid duplicate local branch-ref filenames (`main 2`, `main 3`, `main 4`). Their contents were preserved outside the active refs namespace in `.git/ref-conflict-recovery-20260827/`; the valid `main` branch was unchanged. This local metadata repair is not a prerequisite or hidden dependency of the clean clone.

Independent source review prompted canonical refresh on claim navigation/draft opening, committed-save handling independent of list refresh, claim/revision-keyed audit data with persistent retry errors, labeled receipt entry and overlay focus management. These fixes pass source checks but do not constitute browser/keyboard/responsive visual evidence. Live receipt AI, model-assisted explanations, actual payouts, production identity/security, user visual acceptance, public publication and live cross-platform Actions remain open.

## Clean-clone rehearsal — 2026-08-26

- Clone: `/private/tmp/keel-clean-room.ZqNjSu/repo`
- Source: local repository only; no parent-workspace files copied
- Manual rehearsal verified through commit: `e45d0a7` (`Ignore TypeScript build cache`)
- Prerequisite path: Node 22.13+ declared in `.node-version`, `package.json`, and `AGENTS.md`
- Install: `npm ci` completed from the clone
- Default verification: `npm run check` passed lint, typecheck, build, and 7 automated tests
- Launch: `npm run dev` produced `http://localhost:3000/` without an API key, Docker, database installation, cloud account, or environment configuration

## Default workflow evidence

A generated 24 KB PNG was submitted as a test receipt for “Clean Room Bistro,” amount EUR 86.40, category Meals. Evidence observed from the running clean clone:

- Receipt upload returned `201` and an R2 receipt key.
- The stored amount was `8640` minor units.
- The Meals limit flagged the record as above-limit.
- A self-approval attempt returned `400` with “Submitters cannot approve or reject their own expenses.”
- Maya Chen approved; Julian Hart scheduled and marked paid.
- Reimbursement date was computed as `2026-08-28`.
- The audit route returned submitted, approved, scheduled, and paid events with their actors.
- Receipt retrieval returned `200`, `image/png`, a private cache header, and an ETag.
- CSV contained amount `86.40`, status `paid`, above-limit `yes`, approver `Maya Chen`, and the reimbursement date.

After stopping the app, `npm run reset` deleted project-local state. Relaunch restored exactly six default records and removed the generated test record.

## Customization evidence

The clean clone was configured without application-code edits using:

- Organization: Aster Works
- Accent: `#82E6D0`
- Currency: USD
- Categories/limits: Travel 1800, Meals 95, Software 500, Equipment 1200, Client costs 400
- Approvers: Rina Shah and Tom Vale
- Reimbursement: weekly on Thursday with three days’ lead time

`npm run check` passed after customization. Rendered-output tests confirmed the active organization, accent, categories, primary approver, frequency, and weekday. Reset demo records used USD and only the configured primary approver.

The running customized clone rejected an approval by the default-demo approver Maya Chen with `400` and “This person is not a configured approver.” The same submitted record was then approved by configured approver Rina Shah with `200`; the persisted approver ID and name matched the customized configuration.

The final source-polish pass also replaced stale fixed-date UI, distinguished success from error announcements, added a dismissible mobile-navigation scrim, tightened heading typography, and removed a layout animation flagged by the local quality detector. The clean clone exposed a generated TypeScript build cache, which is now covered by `.gitignore`. The customization rehearsal remained uncommitted in the temporary clone; repository defaults remain Northstar Studio.

## Automated clean-room rehearsal — 2026-08-26

`npm run acceptance:clean-room` passed from committed source `f1c31f19900a4415937858763cc23e0d016c5fb9` after creating its own disposable clone. The command independently:

- installed only the lockfile and ran lint, typecheck, the production build, and all seven tests;
- launched the default demo and completed receipt upload → approval → scheduling → paid → audit → receipt retrieval → CSV;
- rejected self-approval, derived the above-limit flag server-side, and verified the configured reimbursement weekday;
- deleted the local database, relaunched, and recovered exactly six seed records without the test record;
- configured Aster Works with a different accent, USD, limits, approvers, and Thursday schedule without editing application code;
- reran all checks and the full receipt-to-CSV workflow under the customized policy;
- confirmed the only changed tracked file inside the customized clone was `config/business.json`; generated state and build caches remained ignored; and
- deleted the disposable clone after success.

The security-updated Sites toolchain produced a warning-free Vite build. `npm audit` reported zero production or development dependency advisories at this commit. GitHub Actions is configured to run both `npm run check` and the automated clean-room rehearsal on Ubuntu, macOS, and Windows.

## Agent-native repository audit

| Fresh Codex capability | Repository evidence | Status |
| --- | --- | --- |
| Clone from a GitHub URL | Local clone path is rehearsed; public remote does not exist yet | Pending publication |
| Read concise root instructions automatically | Root `AGENTS.md` remains concise and routes tasks to detailed documentation | Proven locally |
| Understand the product without this conversation | `README.md`, product specification, demo-data contract, and setup prompt | Proven locally |
| Check and explain prerequisites simply | `AGENTS.md` names only Node 22.13+ and tells Codex to own every technical step | Proven by content review |
| Launch the original demo without a key | Lockfile install and launch passed from disposable clones | Proven locally |
| Run tests and verify the application | The current production build and all 48 tests pass under default weekly, customized fortnightly, and customized monthly settings in a fresh clone | Proven locally |
| Open the application for the user | Actual local app opened and exercised in the in-app browser | Proven locally |
| Interview with business questions only | Interview wording and behavior are specified in `AGENTS.md` and `docs/CUSTOMIZATION.md` | Proven by content review |
| Customize supported settings without code edits | `npm run configure` changed only `config/business.json` | Proven locally |
| Test and open the customized result | Full customized verification passed in disposable clones; the default app was opened and visually verified | Proven locally |
| Implement feature changes from specifications | Product, design, data, customization, and build contracts route supported and unsupported changes | Proven by content review |
| Rebuild the complete product from repository documentation | `docs/BUILD_SPEC.md` defines architecture, order, routes, persistence, and constraints | Proven by content review |

## Remaining evidence

| Requirement | Status |
| --- | --- |
| Live receipt extraction and natural-language question accuracy | Three synthetic receipt fixtures and four questions pass live; the PNG extraction/confirmation flow also passes in the real browser |
| Successful live answer persistence and browser recovery | Live provider-to-D1 and HTTP restart recovery pass; saved-answer persistence is covered by the bounded live acceptance |
| Production identity, authorization and real payout scope | Open gates in `CONCUR_REPLACEMENT.md`; demo roles are not production authentication |
| Desktop and mobile screenshots from the actual app | Proven locally; tracked PNG evidence covers employee desktop/mobile and above-limit approver detail |
| Visual interaction/keyboard/responsive browser pass | Proven locally across 1440, 1024, 768, 390, and 360 px with focus/Escape/inert/overflow checks |
| Public GitHub URL and fresh clone from that URL | Pending user authorization to publish |
| macOS GitHub Actions run | Workflow committed; live run pending publication |
| Windows GitHub Actions run | Workflow committed; live run pending publication |
| Linux GitHub Actions run | Workflow committed; live run pending publication |
| Sites production deployment | Pending publication authorization and safe owner-access hosting; not required for the local Phase 1 MVP |
