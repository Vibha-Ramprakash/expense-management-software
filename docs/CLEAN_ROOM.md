# Clean-room acceptance

Do not declare the repository complete until every item is evidenced from a fresh temporary clone outside the development directory.

Start with `npm run acceptance:clean-room`. Codex—not the user—runs this command. It creates a disposable clone, installs from the lockfile, verifies the default build, launches the app, exercises receipt-to-CSV behavior, deletes and restores local state, applies a materially different business configuration, repeats the workflow, checks for leaked development files, and removes the clone. Complete the human/browser and public-host items below separately.

For the separate owner-authorized, billable AI rehearsal, follow `LIVE_AI_ACCEPTANCE.md`. Reusable readable synthetic PNG/PDF receipts are checked in under `tests/fixtures/receipts/`. Never add live provider calls or private credentials to the automatic no-key verifier.

## Default reproduction

- [ ] Clone using only the repository URL.
- [ ] Give a fresh Codex task only the public setup prompt in `prompts/SETUP.md`.
- [ ] Confirm Codex reads root `AGENTS.md` without conversation context.
- [ ] Confirm prerequisite checking explains only what the nontechnical user needs.
- [ ] Run `npm ci` and `npm run check` (covered by the automated rehearsal).
- [ ] Launch without any API key, cloud account, Docker, or database installation.
- [ ] Open the exact local URL and verify the default demo renders.

## Workflow

- [ ] Upload an approved readable test receipt and submit it as an employee in the browser. The automated rehearsal uses a synthetic PNG to verify upload/storage/workflow, not receipt readability or OCR accuracy.
- [ ] Confirm amount/category policy evaluation is server-derived (covered by the automated rehearsal).
- [ ] Switch to approver and approve the claim; confirm self-approval is rejected.
- [ ] Switch to finance, schedule the reimbursement, then mark it paid.
- [ ] Export CSV and confirm the claim, exact two-decimal amount, status, approver, and reimbursement date (covered by the automated rehearsal).
- [ ] Round-trip the maximum exact amount through create/edit/read/export; reject an unsafe amount without changing the claim/audit. Verify formula-like merchant/purpose text stays literal in the spreadsheet-safe CSV.
- [ ] Confirm an audit event exists for every transition (covered by the automated rehearsal).
- [ ] Confirm a paid claim's recording timestamp equals its paid audit event and exports separately from the planned reimbursement date. Verify early/late recordings and UTC month boundaries in the monthly metric; do not label manual records as bank settlement.
- [ ] Save a draft without receipt/purpose, reopen it, attach the receipt, and submit; attempts to submit incomplete claims must fail.
- [ ] Request changes, reopen as the submitter, correct and resubmit while keeping the attachment.
- [ ] Race two approvals; exactly one succeeds and only one approval event exists.
- [ ] Finish that draft/correction/reimbursement path without CSV and confirm it disappears from active assistant tasks.
- [ ] Confirm quick assistant answers show only role-appropriate saved claims and are labeled rules-based. Verify that the separate natural-language question form honestly reports a missing key without inventing an answer.
- [ ] With an approved key, verify natural-language interpretation against a varied question set, save an answer, reload/restart, retrieve its saved link/history, change a claim and confirm old answers remain labeled as snapshots. Verify one lost-response retry does not cause another provider call.
- [ ] Verify action/unsupported requests, the per-role daily cap, exact per-currency totals, consent, historical timestamps and saved-answer navigation with real provider/browser evidence; mocked adapter and SQLite tests are not substitutes.

## Live AI and production gates

- [ ] Verify compiled production APIs deny data access before storage until real authentication is implemented. Local foreign/originless write and reset attempts must fail without changing records. After implementing identity, replace this gate with the full non-member, cross-record, role-escalation and revocation matrix in `ACCESS_SECURITY.md`; do not remove the guard just to deploy.
- [ ] Verify actual image and PDF extraction with an owner-authorized key and an approved test set; mocked tests are not OCR proof.
- [ ] Verify provider errors, ambiguous facts, currency mismatch, consent and human correction in the real UI.
- [ ] Complete live acceptance of the model-backed assistant, authenticated record access and other required production/migration gates in `CONCUR_REPLACEMENT.md` before claiming Concur replacement.
- [ ] Verify real settlement only if a payment integration is selected; a demo paid status is not a bank transfer.

## Customization

- [ ] Conduct the business interview without technical questions.
- [ ] Apply a different organization, accent, currency if desired, categories, limits, approvers, and reimbursement schedule through `npm run configure`.
- [ ] Reset when policy/currency changes, run `npm run check`, launch, and open the result.
- [ ] Confirm every supported value appears or behaves correctly without application-code edits.
- [ ] Verify a fortnightly first-date anchor and monthly day-31 run, including leap/short-month boundaries and lead time. Change cadence and confirm already scheduled/paid dates stay unchanged. Invalid settings must not replace the saved configuration.

## Reset and independence

- [ ] Stop the app, run `npm run reset`, relaunch, and confirm the working demo is restored.
- [ ] Confirm no untracked development files, parent-workspace files, secrets, or hidden conversation context were needed.
- [ ] Confirm the checked-in screenshots match desktop and mobile behavior.
- [ ] Push and confirm the GitHub Actions matrix passes on Ubuntu, macOS, and Windows.

Record the clone path, commit SHA, commands, dates, screenshots, CSV sample, and CI run URL in `docs/ACCEPTANCE_EVIDENCE.md`.
