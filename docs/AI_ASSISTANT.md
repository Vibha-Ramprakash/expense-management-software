# Expense assistant specification

Status: grounded attention service, natural-language question adapter and saved-answer UI implemented. Four live synthetic question checks and restart persistence passed on 2026-08-28. Wider language accuracy, browser interaction, real-user authentication and external reminders remain pending. The receipt extractor is a separate feature.

## Implemented foundation

`GET /api/assistant?role=employee|approver|finance` derives a digest from D1 claims through `lib/attention.mjs`. `components/AttentionPanel.tsx` presents explicit questions for next steps, missing details, approvals and reimbursements, with links to real claim records and an as-of time. It is labeled rules-based live workflow facts; no AI request is made. Failed fetches, empty queues and role changes have explicit states, and stale responses are discarded.

Drafts can be saved without a receipt or purpose, then reopened, completed and submitted. Rejected claims can be reopened by the submitting employee, corrected and resubmitted. Positive amount, valid date, merchant and configured category are required even for a draft. Submission requires both a receipt and business purpose. Attention is recomputed after changes; paid claims leave the active task list.

The demo role selects a fixed server-defined actor. The digest filters employees to their own active claims, approvers to submitted claims excluding their own, and finance to approved/scheduled claims. This is useful demo scoping, NOT production authorization: the role switch and other demo APIs remain accessible without sign-in. Never deploy this as a secure employee workspace.

## Natural-language question desk

`POST /api/assistant/answers` accepts a standalone question, demo role, UUID request ID and explicit consent. OpenAI interprets only the question/role/current time into a strict, validated filter plan. Receipt bytes, the ledger and saved questions are not sent. The model has no tools, SQL, URLs, free-form financial answer text or mutation authority. Its interpretation is shown to the user so an incorrect classification can be noticed and corrected.

Supported filters are workflow topic, status (including recorded paid claims), exact merchant text mentioned in the question, above-limit flags, past-due scheduled reimbursements, and days since the claim's last change. “Overdue approvals” defaults to three days of age, explicitly not a contractual approval deadline. Date-range/amount/category filters, tax questions, bank feeds and requests to perform an action are not currently supported by this question interpreter; they must not silently appear to succeed. Questions are standalone, not a conversation with inferred memory.

After interpretation, the server rereads canonical claims and produces explanations, counts, links and per-currency totals deterministically. It uses integer/BigInt minor-unit calculations, returns at most 25 claim links, and states when the count/totals include further matches. It never adds different currencies. Finance may query recorded paid claims; approver questions stay restricted to others' submitted claims. These are demo-scoping rules, not real authorization.

The same private AI connection as receipt extraction is used. Live questions and saved history are local-development only until authentication is implemented. Requests are capped at 5 KB and questions at 800 characters. One question runs at a time per Worker instance, with an atomic local cap of 50 reserved questions per demo role/actor/UTC day. This is not a provider spending cap and does not cover receipt extraction. Resetting demo data resets the local cap too; production needs non-resettable quotas and real identities.

Questions receive an ID and a D1 pending record before the model call. Repeated IDs never run the model again, and conflicting question/role reuse is rejected. Successful interpretations and provider ID/token usage are saved before building the answer; estimated cost is `null` rather than an invented price. Failed/incomplete requests have an explicit state. There is no automatic retry. An interrupted pending request may require an explicit new question after checking history.

`GET /api/assistant/answers?role=...` returns the latest 20 saved entries; adding `id=...` retrieves an older entry in that role. Links use `/#answer=<id>&role=<role>` in the question desk. Each answer is an as-of snapshot, not a live balance. Opening a claim rereads its latest record. Refreshing history does not generate a new answer or incur an AI call. Questions/answers survive page reloads and local app restarts, but demo reset removes them. The user must select the link's demo role before opening a different role's answer.

The UI shows the actual answer `asOf` time, not the earlier request reservation time, and keeps saved/reused answers conservatively marked as potentially stale. After a confirmed terminal response, asking again creates a new explicit request; after a lost response the same request ID is retained to avoid duplicate billing. Saved-answer links/history selections move focus to the answer heading. Browser confirmation of these source-level behaviors remains required.

## Business jobs

- Employee: show saved drafts, missing receipts, missing business purpose, returned claims and reimbursement status; open the exact affected claim.
- Approver: show assigned pending approvals, age, policy exceptions and the next allowed decision.
- Finance: show approved but unscheduled claims, upcoming runs, overdue scheduled reimbursements and unresolved payment failures when a payment integration exists.
- Answer questions such as “What is waiting on me?”, “Who needs to approve this?” and “What is still missing?” using canonical current records.

## Grounding and authority

Compute counts, totals, deadlines and allowed actions deterministically on the server. The model may explain those facts, not invent or calculate authoritative money values. Return evidence links/record IDs and the as-of time. Filter data using authenticated identity before sending any context to the model. Demo role selection is not production authentication.

Missing receipt tracking means a known saved draft or authorized imported transaction has no receipt. It cannot detect an expense that was never recorded and has no connected card feed. The saved-draft/attachment path now supports this job. Receipt attachment remains separate from OCR attempts. Seed records have no real receipt bytes, so their missing attachment notices are intentional, not proof of a storage failure.

The assistant is read-only. It opens claims but does not prepare or execute financial mutations. Approval, rejection, schedule changes, reminders to others and payouts need the appropriate human confirmation, server authorization and audit event. Never auto-approve, waive a limit, or claim that a payment settled without settlement evidence.

## Persistence and notifications

Task state and any saved conversations belong in D1; uploaded files belong in R2. A temporary browser answer is not a durable task. Product reminders are in-app first. Background email, push or chat reminders are separate authorized integrations with opt-outs, deduplication and delivery state. Do not substitute a Codex automation for the app's reminder service.

## Acceptance

Test each role, cross-user access denial, stale responses after status changes, missing receipts, empty queues, aging boundaries, multi-currency totals, provider failure and instruction injection in merchant/memo/receipt text. Verify no assistant response can mutate a financial record or leak another user's record. Plain-language answers must link to real claims and not hallucinate the existence of card feeds, mail delivery or payment execution.

`tests/assistant-query.test.mjs` uses mocked provider responses and a real in-memory SQLite database to check schema/plan validation, role-scoped facts, exact mixed-currency totals, truncation disclosure, action refusal and the production reservation SQL's duplicate-ID/day-limit behavior. Clean-room checks exercise no-key, no-consent and cross-origin failures against the running application. These do not prove live language interpretation, real-user access control, successful provider-to-D1 completion or browser interaction; those remain separate acceptance gates.

The separate 2026-08-28 live HTTP rehearsal verified pending approvals, scheduled reimbursements, employee missing receipt/purpose and a refused approval action. Query counts/totals/links matched independently filtered canonical records. Successful answers and usage were persisted, identical request IDs returned saved responses, changed-question ID reuse returned 409, other-demo-role lookups returned 404, and all four answers survived an app restart. No question changed financial records. This is limited live provider-to-D1 evidence, not a broad semantic benchmark or real-user/browser access test. Reproduce using `LIVE_AI_ACCEPTANCE.md` and consult `ACCEPTANCE_EVIDENCE.md` for dated outcomes.

Implementation reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Schema adherence is not a guarantee of semantic correctness; application validation and canonical computation remain authoritative.
