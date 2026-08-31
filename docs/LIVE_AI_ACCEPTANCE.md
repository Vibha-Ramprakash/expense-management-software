# Live AI rehearsal

This is an opt-in, billable check, separate from the key-free CI and clean-room workflow. Codex runs it only after the owner connects a key privately and authorizes synthetic test requests. Never publish or remove access controls to make it run. Use an isolated local copy and synthetic data; do not reset or alter the owner's working ledger.

## Reusable receipt fixtures

Files under `tests/fixtures/receipts/` contain no personal data and are clearly marked synthetic. They are readable documents, unlike the clean-room verifier's one-pixel storage fixture.

| File | Merchant | Date | Printed total | Expected category | Expected result in the default EUR workspace |
| --- | --- | --- | --- | --- | --- |
| `meals-eur.png` | Harbor Lunch Counter | 2026-08-26 | EUR 22.50 | Meals | Amount `22.50`; review required |
| `travel-eur.pdf` | Alpine Rail | 2026-08-25 | EUR 54.20 | Travel | Amount `54.20`; review required |
| `meals-usd.pdf` | Maple Cafe | 2026-08-24 | USD 25.60 | Meals | Currency `USD`, amount `null`, currency mismatch and review required; no conversion |

Do not silently change expected values to accommodate a wrong extraction. These three clear examples are a smoke test, not a representative OCR benchmark. Rotated/blurred photos, unreadable and non-receipt documents, ambiguous dates/totals/currencies, malicious document instructions and user correction still need a wider test set and browser acceptance.

## HTTP and persistence rehearsal

1. Start the isolated default demo with its private key connection. Confirm the exact printed local URL responds. Never copy the key into a command, source, test log or public artifact.
2. Snapshot `GET /api/expenses`. For each approved fixture, POST multipart `receipt` and `consent=yes` to `/api/receipts/extract`, with the exact same-origin `Origin` and `x-keel-ai-request: 1` headers. Check every field in the table, `requiresReview=true` and currency warnings. Stop on provider quota/authentication errors rather than retrying repeatedly. Confirm the ledger is unchanged by extraction.
3. Review the EUR travel result against the original document. Submit those confirmed fields and the PDF through `/api/expenses` with a business purpose clearly identifying a synthetic verification claim. Require 5420 stored minor units and a byte-identical receipt download.
4. As the demo approver ask “Which expenses are waiting for approval?” through `/api/assistant/answers`. Use a fresh UUID request ID, `consent=true`, role, question, JSON content type and the same-origin/custom headers. Independently filter the current ledger for submitted claims excluding the approver's own claims, then check exact counts, currency-separated integer totals and claim links.
5. Ask “Approve all pending claims now.” The answer must say an action was requested but nothing was changed. Compare the complete ledger before/after; the assistant must not approve any claim.
6. Use the normal reviewed approver and finance actions to approve and schedule only the synthetic travel claim, carrying its current `expectedUpdatedAt` each time. Ask finance “Which reimbursements are scheduled?” and independently check scheduled claims/counts/totals. Record the synthetic claim as paid and verify the audit trail. This is a simulated finance record, never a bank transfer. No CSV is used to reach this point.
7. Save a separate synthetic EUR 15.00 Meals draft without receipt or purpose. Ask the employee “Which of my expenses are missing receipts or business purpose?” Check their active saved claims with missing attachment/purpose against the ledger. Verify the missing draft is listed and the paid travel claim leaves active attention.
8. For each query, retrieve the saved answer by ID/history. Replay the identical request ID and require `reused=true` and an identical entry. Reusing the ID for a different question must fail; retrieving it through another demo role must fail. These are demo-scoping checks, not real-user authentication proof.
9. Restart the same isolated app without reset. Retrieve all saved answers and the paid claim; require unchanged snapshots, usage metadata and status. These reads must not generate new AI requests. Separately verify the UI labels old answers as snapshots when the live ledger has changed.
10. Optionally export CSV after completion and verify the stored amount plus distinct scheduled and payment-recording dates. Record the model/date, field-level outcomes, exact scope, failures and remaining gates in `ACCEPTANCE_EVIDENCE.md`. Preserve test receipts in the repository, not private credentials or personal receipts.

The browser pass is additional: upload, per-receipt consent, editable suggestions, human confirmation, error recovery, saved-answer focus/navigation, responsive layout and sign-in cannot be certified by these HTTP checks alone. Real identity and hosted access remain governed by `ACCESS_SECURITY.md`.
